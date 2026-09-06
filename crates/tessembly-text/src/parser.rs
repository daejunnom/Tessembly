use tessembly_core::{Constraints, Error, Node, NodeKind, Piece, Predicate, PredicateKind, Result,
    Span, MAX_DEPTH, MAX_INPUT, MAX_NODES, MAX_PREDICATES, PROFILE};

pub fn parse(text: &str, profile: &str) -> Result<Node> {
    if profile != PROFILE { return Err(Error::new("UNSUPPORTED_PROFILE")); }
    if text.len() > MAX_INPUT { return Err(Error::new("INPUT_LIMIT")); }
    let mut parser = Parser { source: text.as_bytes(), at: 0, nodes: 0, predicates: 0 };
    let node = parser.pattern(0)?;
    parser.ws();
    if parser.at != parser.source.len() { return Err(parser.error("UNEXPECTED_TOKEN")); }
    node.validate()?;
    Ok(node)
}
struct Parser<'a> { source: &'a [u8], at: usize, nodes: usize, predicates: usize }
impl Parser<'_> {
    fn ws(&mut self) { while self.source.get(self.at).is_some_and(u8::is_ascii_whitespace) { self.at += 1; } }
    fn peek(&mut self) -> Option<u8> { self.ws(); self.source.get(self.at).copied() }
    fn eat(&mut self, c: u8) -> bool {
        if self.peek() == Some(c) { self.at += 1; true } else { false }
    }
    fn expect(&mut self, c: u8) -> Result<()> {
        if self.eat(c) { Ok(()) } else { Err(self.error("EXPECTED_TOKEN")) }
    }
    fn error(&self, code: &'static str) -> Error {
        Error::at(code, self.at, (self.at + 1).min(self.source.len()))
    }
    fn node(&mut self, kind: NodeKind, start: usize) -> Result<Node> {
        self.nodes += 1;
        if self.nodes > MAX_NODES { return Err(self.error("NODE_LIMIT")); }
        Ok(Node::new(kind, Span { start, end: self.at }))
    }
    fn pattern(&mut self, depth: usize) -> Result<Node> {
        if depth > MAX_DEPTH / 3 { return Err(self.error("NESTING_LIMIT")); }
        self.ws(); let start = self.at;
        let mut branches = vec![self.sequence(depth)?];
        while self.eat(b';') { branches.push(self.sequence(depth)?); }
        if branches.len() == 1 { Ok(branches.remove(0)) } else { self.node(NodeKind::Union(branches), start) }
    }
    fn sequence(&mut self, depth: usize) -> Result<Node> {
        self.ws(); let start = self.at;
        let mut children = Vec::new();
        loop {
            match self.peek() {
                None | Some(b';' | b'}') => break,
                Some(b',') => { self.at += 1; }
                _ => children.push(self.item(depth)?),
            }
        }
        match children.len() {
            0 => Err(self.error("EMPTY_SEQUENCE")),
            1 => Ok(children.remove(0)),
            _ => self.node(NodeKind::Concat(children), start),
        }
    }
    fn item(&mut self, depth: usize) -> Result<Node> {
        self.ws(); let start = self.at;
        let kind = match self.peek() {
            Some(c) if Piece::from_ascii(c).is_ok() => {
                self.at += 1; NodeKind::Literal(Piece::from_ascii(c)?)
            }
            Some(b'P' | b'p') => {
                self.at += 1;
                let take = self.number()?;
                if !(1..=7).contains(&take) { return Err(self.error("INVALID_COUNT")); }
                NodeKind::Pool { mask: 127, take }
            }
            Some(b'*') => {
                self.at += 1; NodeKind::Pool { mask: 127, take: if self.eat(b'!') { 7 } else { 1 } }
            }
            Some(b'[') => {
                self.at += 1; let complement = self.eat(b'^');
                let mut mask = 0u8;
                loop {
                    match self.peek() {
                        Some(b']') => { self.at += 1; break; }
                        Some(b',') => self.at += 1,
                        Some(c) => {
                            let p = Piece::from_ascii(c).map_err(|_| self.error("INVALID_CHOICE"))?;
                            mask |= p.bit(); self.at += 1;
                        }
                        None => return Err(self.error("UNCLOSED_CHOICE")),
                    }
                }
                if complement { mask ^= 127; }
                if mask == 0 { return Err(self.error("EMPTY_CHOICE")); }
                let take = if self.eat(b'!') { mask.count_ones() as u8 }
                    else if self.peek().is_some_and(|c| c.is_ascii_digit()) { self.number()? } else { 1 };
                if take == 0 || u32::from(take) > mask.count_ones() { return Err(self.error("INVALID_COUNT")); }
                NodeKind::Pool { mask, take }
            }
            Some(b'{') => {
                self.at += 1; let child = self.pattern(depth + 1)?; self.expect(b'}')?;
                NodeKind::Scope(Box::new(child))
            }
            _ => return Err(self.error("UNEXPECTED_TOKEN")),
        };
        let mut node = self.node(kind, start)?;
        if self.eat(b':') {
            let mut constraints = Constraints::default(); let mut blocks = 0;
            while let Some(domain @ (b'D' | b'U')) = self.peek() {
                self.at += 1;
                let slot = if domain == b'D' { &mut constraints.draw } else { &mut constraints.use_order };
                if slot.is_some() { return Err(self.error("DUPLICATE_LOCAL_BLOCK")); }
                self.expect(b'(')?;
                let mut predicates = self.predicate()?;
                while self.eat(b',') { predicates.extend(self.predicate()?); }
                self.expect(b')')?;
                *slot = Some(predicates); blocks += 1;
            }
            if blocks == 0 { return Err(self.error("EXPECTED_LOCAL_OPTION")); }
            node.constraints = constraints;
        }
        node.span.end = self.at;
        Ok(node)
    }
    fn number(&mut self) -> Result<u8> {
        let mut value = 0u8; let mut found = false;
        while let Some(c @ b'0'..=b'9') = self.peek() {
            found = true; self.at += 1;
            value = value.checked_mul(10).and_then(|v| v.checked_add(c - b'0'))
                .ok_or_else(|| self.error("COUNT_OVERFLOW"))?;
        }
        if found { Ok(value) } else { Err(self.error("EXPECTED_COUNT")) }
    }
    fn group(&mut self) -> Result<Vec<Piece>> {
        let mut mask = 0u8;
        while let Some(c) = self.peek() {
            match Piece::from_ascii(c) {
                Ok(p) if c.is_ascii_uppercase() => { mask |= p.bit(); self.at += 1; }
                _ => break,
            }
        }
        if mask == 0 { return Err(self.error("EXPECTED_PIECE_GROUP")); }
        Ok(Piece::ALL.into_iter().filter(|p| mask & p.bit() != 0).collect())
    }
    fn push_predicate(&mut self, out: &mut Vec<Predicate>, kind: PredicateKind, start: usize) -> Result<()> {
        self.predicates += 1;
        if self.predicates > MAX_PREDICATES { return Err(self.error("PREDICATE_LIMIT")); }
        out.push(Predicate { kind, span: Span { start, end: self.at } }); Ok(())
    }
    fn predicate(&mut self) -> Result<Vec<Predicate>> {
        self.ws(); let start = self.at;
        let mut left = self.group()?;
        let mut out = Vec::new();
        while let Some(op @ (b'<' | b'>')) = self.peek() {
            self.at += 1; let right = self.group()?;
            for a in &left { for b in &right {
                let kind = if op == b'>' { PredicateKind::Before(*a, *b) } else { PredicateKind::Before(*b, *a) };
                self.push_predicate(&mut out, kind, start)?;
            }}
            left = right;
        }
        if out.is_empty() { for p in left { self.push_predicate(&mut out, PredicateKind::Present(p), start)?; } }
        Ok(out)
    }
}

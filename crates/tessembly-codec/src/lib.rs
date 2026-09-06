//! Experimental structural AST wire v1. Not a source-text wrapper or expanded queue file.
#![forbid(unsafe_code)]
use tessembly_core::{
    Constraints, Error, Node, NodeKind, Piece, Predicate, PredicateKind, Result, Span, MAX_DEPTH,
    MAX_NODES, MAX_PREDICATES,
};

const MAGIC: &[u8; 6] = b"TSMB\x01\x02"; // wire 1, explicit RFC2 semantics
const MAX_BYTES: usize = 1_048_576;
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Extension {
    pub id: u32,
    pub bytes: Vec<u8>,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Document {
    pub root: Node,
    pub optional_extensions: Vec<Extension>,
}

fn var(out: &mut Vec<u8>, mut v: usize) {
    loop {
        let b = (v & 127) as u8;
        v >>= 7;
        out.push(b | if v == 0 { 0 } else { 128 });
        if v == 0 {
            break;
        }
    }
}
fn span(out: &mut Vec<u8>, s: Span) {
    var(out, s.start);
    var(out, s.end);
}
fn write_node(out: &mut Vec<u8>, n: &Node) {
    match &n.kind {
        NodeKind::Literal(p) => out.push((*p as u8) << 4),
        NodeKind::Pool { mask, take } => out.extend_from_slice(&[1, *mask, *take]),
        NodeKind::Concat(ns) | NodeKind::Union(ns) => {
            out.push(if matches!(n.kind, NodeKind::Concat(_)) {
                2
            } else {
                3
            });
            var(out, ns.len());
            for child in ns {
                write_node(out, child);
            }
        }
        NodeKind::Scope(child) => {
            out.push(4);
            write_node(out, child);
        }
    }
    span(out, n.span);
    out.push(
        u8::from(n.constraints.draw.is_some()) | (u8::from(n.constraints.use_order.is_some()) << 1),
    );
    for ps in [&n.constraints.draw, &n.constraints.use_order]
        .into_iter()
        .flatten()
    {
        var(out, ps.len());
        for p in ps {
            match p.kind {
                PredicateKind::Present(a) => out.extend_from_slice(&[0, a as u8]),
                PredicateKind::Before(a, b) => {
                    out.extend_from_slice(&[1, a as u8 | ((b as u8) << 3)])
                }
            }
            span(out, p.span);
        }
    }
}
pub fn encode(doc: &Document) -> Result<Vec<u8>> {
    doc.root.validate()?;
    if doc.optional_extensions.len() > 64 {
        return Err(Error::new("EXTENSION_LIMIT"));
    }
    let mut body = Vec::new();
    write_node(&mut body, &doc.root);
    var(&mut body, doc.optional_extensions.len());
    let mut ids = std::collections::BTreeSet::new();
    for ext in &doc.optional_extensions {
        if !ids.insert(ext.id) {
            return Err(Error::new("DUPLICATE_EXTENSION"));
        }
        if ext.bytes.len() > MAX_BYTES || body.len().saturating_add(ext.bytes.len()) > MAX_BYTES {
            return Err(Error::new("BINARY_LIMIT"));
        }
        var(&mut body, ext.id as usize);
        body.push(0); // only optional metadata is supported
        var(&mut body, ext.bytes.len());
        body.extend_from_slice(&ext.bytes);
    }
    if body.len() > MAX_BYTES {
        return Err(Error::new("BINARY_LIMIT"));
    }
    let mut out = MAGIC.to_vec();
    var(&mut out, body.len());
    out.extend(body);
    Ok(out)
}
struct Reader<'a> {
    b: &'a [u8],
    at: usize,
    nodes: usize,
    predicates: usize,
}
impl Reader<'_> {
    fn byte(&mut self) -> Result<u8> {
        let b = *self
            .b
            .get(self.at)
            .ok_or_else(|| Error::new("TRUNCATED_BINARY"))?;
        self.at += 1;
        Ok(b)
    }
    fn var(&mut self) -> Result<usize> {
        let mut v = 0u64;
        for i in 0..10 {
            let b = self.byte()?;
            if i == 9 && b > 1 {
                return Err(Error::new("VARINT_OVERFLOW"));
            }
            v |= u64::from(b & 127) << (i * 7);
            if b & 128 == 0 {
                if i != 0 && b == 0 {
                    return Err(Error::new("NONCANONICAL_VARINT"));
                }
                return usize::try_from(v).map_err(|_| Error::new("VARINT_OVERFLOW"));
            }
        }
        Err(Error::new("VARINT_OVERFLOW"))
    }
    fn span(&mut self) -> Result<Span> {
        let s = Span {
            start: self.var()?,
            end: self.var()?,
        };
        if s.start > s.end {
            return Err(Error::new("INVALID_SPAN"));
        }
        Ok(s)
    }
    fn predicates(&mut self) -> Result<Vec<Predicate>> {
        let count = self.var()?;
        if count == 0 || count > MAX_PREDICATES.saturating_sub(self.predicates) {
            return Err(Error::new("PREDICATE_LIMIT"));
        }
        self.predicates += count;
        let mut out = Vec::new();
        for _ in 0..count {
            let tag = self.byte()?;
            let code = self.byte()?;
            let kind = match tag {
                0 => PredicateKind::Present(Piece::from_id(code)?),
                1 if code & 192 == 0 => {
                    PredicateKind::Before(Piece::from_id(code & 7)?, Piece::from_id(code >> 3)?)
                }
                _ => return Err(Error::new("INVALID_PREDICATE_TAG")),
            };
            out.push(Predicate {
                kind,
                span: self.span()?,
            });
        }
        Ok(out)
    }
    fn node(&mut self, depth: usize) -> Result<Node> {
        self.nodes += 1;
        if depth > MAX_DEPTH || self.nodes > MAX_NODES {
            return Err(Error::new("AST_LIMIT"));
        }
        let tag = self.byte()?;
        let kind = match tag {
            t if t & 15 == 0 => NodeKind::Literal(Piece::from_id(t >> 4)?),
            1 => NodeKind::Pool {
                mask: self.byte()?,
                take: self.byte()?,
            },
            2 | 3 => {
                let count = self.var()?;
                if count == 0 || count > MAX_NODES {
                    return Err(Error::new("NODE_LIMIT"));
                }
                let mut ns = Vec::new();
                for _ in 0..count {
                    ns.push(self.node(depth + 1)?);
                }
                if tag == 2 {
                    NodeKind::Concat(ns)
                } else {
                    NodeKind::Union(ns)
                }
            }
            4 => NodeKind::Scope(Box::new(self.node(depth + 1)?)),
            _ => return Err(Error::new("UNSUPPORTED_NODE")),
        };
        let span = self.span()?;
        let flags = self.byte()?;
        if flags > 3 {
            return Err(Error::new("INVALID_NODE_FLAGS"));
        }
        let draw = if flags & 1 != 0 {
            Some(self.predicates()?)
        } else {
            None
        };
        let use_order = if flags & 2 != 0 {
            Some(self.predicates()?)
        } else {
            None
        };
        Ok(Node {
            kind,
            constraints: Constraints { draw, use_order },
            span,
        })
    }
}
pub fn decode(bytes: &[u8]) -> Result<Document> {
    if bytes.len() > MAX_BYTES + 16 {
        return Err(Error::new("BINARY_LIMIT"));
    }
    if bytes.get(..6) != Some(MAGIC.as_slice()) {
        return Err(Error::new("UNSUPPORTED_WIRE_OR_PROFILE"));
    }
    let mut r = Reader {
        b: bytes,
        at: 6,
        nodes: 0,
        predicates: 0,
    };
    let len = r.var()?;
    if len != bytes.len().saturating_sub(r.at) {
        return Err(Error::new("BINARY_LENGTH_MISMATCH"));
    }
    let root = r.node(0)?;
    root.validate()?;
    let count = r.var()?;
    if count > 64 {
        return Err(Error::new("EXTENSION_LIMIT"));
    }
    let mut optional_extensions = Vec::new();
    let mut ids = std::collections::BTreeSet::new();
    for _ in 0..count {
        let id = u32::try_from(r.var()?).map_err(|_| Error::new("EXTENSION_ID_OVERFLOW"))?;
        if !ids.insert(id) {
            return Err(Error::new("DUPLICATE_EXTENSION"));
        }
        match r.byte()? {
            0 => {}
            1 => return Err(Error::new("UNSUPPORTED_CRITICAL_EXTENSION")),
            _ => return Err(Error::new("INVALID_EXTENSION_FLAGS")),
        }
        let len = r.var()?;
        let end =
            r.at.checked_add(len)
                .ok_or_else(|| Error::new("BINARY_LIMIT"))?;
        let value =
            r.b.get(r.at..end)
                .ok_or_else(|| Error::new("TRUNCATED_BINARY"))?
                .to_vec();
        r.at = end;
        optional_extensions.push(Extension { id, bytes: value });
    }
    if r.at != bytes.len() {
        return Err(Error::new("TRAILING_BINARY"));
    }
    Ok(Document {
        root,
        optional_extensions,
    })
}

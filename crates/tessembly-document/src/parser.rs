use crate::{Call, Document, NamedPredicate, Value};
use std::collections::{BTreeMap, BTreeSet};
use tessembly_core::{
    Error, Result, LEGACY_PROFILE, MAX_DEPTH, MAX_INPUT, MAX_NODES, MAX_PREDICATES, PROFILE,
};

pub fn parse(text: &str) -> Result<Document> {
    parse_profile(text, PROFILE)
}

/// Explicit legacy parsing; output preserves relationships rather than source spelling.
pub fn migrate_rfc2(text: &str) -> Result<String> {
    parse_profile(text, LEGACY_PROFILE)?.to_text()
}

fn parse_profile(text: &str, profile: &'static str) -> Result<Document> {
    if text.len() > MAX_INPUT {
        return Err(Error::new("INPUT_LIMIT"));
    }
    let mut p = Parser {
        text,
        at: 0,
        nodes: 0,
        profile,
        predicates: 0,
    };
    if p.ident()? != "tessembly" {
        return Err(p.error("PROFILE_REQUIRED"));
    }
    if p.string()? != profile {
        return Err(p.error("UNSUPPORTED_PROFILE"));
    }
    p.expect(b';')?;
    let mut doc = Document::empty();
    let mut seen = BTreeSet::new();
    while p.peek().is_some() {
        let name = p.ident()?;
        if !matches!(name.as_str(), "reference" | "select") && !seen.insert(name.clone()) {
            return Err(p.error("DUPLICATE_DECLARATION"));
        }
        if name == "config" {
            p.expect(b'{')?;
            while p.peek() != Some(b'}') {
                let key = p.ident()?;
                p.expect(b'=')?;
                let v = p.value(0)?;
                p.expect(b';')?;
                if doc.config.insert(key, v).is_some() {
                    return Err(p.error("DUPLICATE_CONFIG_KEY"));
                }
            }
            p.expect(b'}')?;
            if p.peek() == Some(b';') {
                p.at += 1;
            }
            continue;
        }
        if name == "draw" || name == "use" {
            p.expect(b'(')?;
            let (parsed, at) = tessembly_text::filter::parse_conditions(
                p.text,
                p.at,
                profile,
                true,
                &mut p.predicates,
            )?;
            p.at = at;
            let mut predicates = Vec::new();
            for (f, _) in parsed {
                NamedPredicate::append(f, &mut predicates);
            }
            if !predicates
                .iter()
                .any(|p| matches!(p, NamedPredicate::Filter(_)))
            {
                predicates.sort();
                predicates.dedup();
            }
            if name == "draw" {
                doc.draw = predicates;
            } else {
                doc.use_order = predicates;
            }
            p.expect(b';')?;
            continue;
        }
        let call = p.call(name.clone(), 0)?;
        p.expect(b';')?;
        match name.as_str() {
            "supply" => {
                call.keys(&[])?;
                call.arity(1)?;
                doc.source = Some(normalize_source(
                    call.args
                        .into_iter()
                        .next()
                        .ok_or_else(|| p.error("SUPPLY_REQUIRED"))?,
                    profile,
                )?);
            }
            "reference" => doc.references.push(call),
            "select" => doc.decisions.push(call),
            _ => return Err(p.error("UNKNOWN_DECLARATION")),
        }
    }
    doc.validate()?;
    Ok(doc)
}
fn normalize_source(value: Value, profile: &str) -> Result<Value> {
    match value {
        Value::Text(s) => Ok(Value::Pattern(Box::new(tessembly_text::parse(
            &s, profile,
        )?))),
        Value::Call(mut c) if c.name == "pattern" => {
            c.keys(&[])?;
            c.arity(1)?;
            let text = c.args.remove(0).text()?.to_owned();
            Ok(Value::Pattern(Box::new(tessembly_text::parse(
                &text, profile,
            )?)))
        }
        Value::Call(mut c) => {
            match c.name.as_str() {
                "take" | "repeat" if c.args.len() == 2 => {
                    let child = c.args.pop().ok_or_else(|| Error::new("ARGUMENT_COUNT"))?;
                    c.args.push(normalize_source(child, profile)?);
                }
                "concat" | "either" => {
                    c.args = c
                        .args
                        .into_iter()
                        .map(|v| normalize_source(v, profile))
                        .collect::<Result<_>>()?;
                }
                _ => {}
            }
            Ok(Value::Call(c))
        }
        _ => Err(Error::new("INVALID_SOURCE")),
    }
}
struct Parser<'a> {
    text: &'a str,
    at: usize,
    nodes: usize,
    profile: &'static str,
    predicates: usize,
}
impl Parser<'_> {
    fn error(&self, code: &'static str) -> Error {
        Error::at(code, self.at, self.at)
    }
    fn skip(&mut self) {
        loop {
            while self
                .text
                .as_bytes()
                .get(self.at)
                .is_some_and(u8::is_ascii_whitespace)
            {
                self.at += 1;
            }
            if self.text.as_bytes().get(self.at..self.at + 2) == Some(b"//") {
                while self
                    .text
                    .as_bytes()
                    .get(self.at)
                    .is_some_and(|b| *b != b'\n')
                {
                    self.at += 1;
                }
            } else {
                break;
            }
        }
    }
    fn peek(&mut self) -> Option<u8> {
        self.skip();
        self.text.as_bytes().get(self.at).copied()
    }
    fn expect(&mut self, b: u8) -> Result<()> {
        if self.peek() != Some(b) {
            return Err(self.error("UNEXPECTED_TOKEN"));
        }
        self.at += 1;
        Ok(())
    }
    fn ident(&mut self) -> Result<String> {
        self.skip();
        let start = self.at;
        if !self
            .text
            .as_bytes()
            .get(self.at)
            .is_some_and(|b| b.is_ascii_alphabetic() || *b == b'_')
        {
            return Err(self.error("EXPECTED_IDENTIFIER"));
        }
        self.at += 1;
        while self
            .text
            .as_bytes()
            .get(self.at)
            .is_some_and(|b| b.is_ascii_alphanumeric() || *b == b'_')
        {
            self.at += 1;
        }
        Ok(self.text[start..self.at].into())
    }
    fn string(&mut self) -> Result<String> {
        self.expect(b'"')?;
        let mut out = String::new();
        loop {
            let c = self.text[self.at..]
                .chars()
                .next()
                .ok_or_else(|| self.error("UNCLOSED_STRING"))?;
            self.at += c.len_utf8();
            match c {
                '"' => return Ok(out),
                '\\' => {
                    let e = self.text[self.at..]
                        .chars()
                        .next()
                        .ok_or_else(|| self.error("UNCLOSED_STRING"))?;
                    self.at += e.len_utf8();
                    out.push(match e {
                        'n' => '\n',
                        'r' => '\r',
                        't' => '\t',
                        '\\' => '\\',
                        '"' => '"',
                        _ => return Err(self.error("INVALID_ESCAPE")),
                    });
                }
                c if c.is_control() => return Err(self.error("CONTROL_IN_STRING")),
                _ => out.push(c),
            }
        }
    }
    fn value(&mut self, depth: usize) -> Result<Value> {
        self.nodes += 1;
        if depth > MAX_DEPTH || self.nodes > MAX_NODES {
            return Err(self.error("DOCUMENT_LIMIT"));
        }
        match self.peek() {
            Some(b'"') => Ok(Value::Text(self.string()?)),
            Some(b'[') => {
                self.at += 1;
                let mut xs = Vec::new();
                if self.peek() != Some(b']') {
                    loop {
                        xs.push(self.value(depth + 1)?);
                        if self.peek() != Some(b',') {
                            break;
                        }
                        self.at += 1;
                    }
                }
                self.expect(b']')?;
                Ok(Value::List(xs))
            }
            Some(b'0'..=b'9') => {
                let start = self.at;
                while self
                    .text
                    .as_bytes()
                    .get(self.at)
                    .is_some_and(u8::is_ascii_digit)
                {
                    self.at += 1;
                }
                let n = self.text[start..self.at]
                    .parse()
                    .map_err(|_| self.error("INTEGER_OVERFLOW"))?;
                Ok(Value::Number(n))
            }
            Some(_) => {
                let id = self.ident()?;
                if self.peek() == Some(b'(') {
                    return Ok(Value::Call(self.call(id, depth + 1)?));
                }
                if matches!(self.peek(), Some(b'<' | b'>')) {
                    let mut left = id;
                    let mut all = Vec::new();
                    while matches!(self.peek(), Some(b'<' | b'>')) {
                        let op = self.text.as_bytes()[self.at];
                        self.at += 1;
                        let right = self.ident()?;
                        for s in [&left, &right] {
                            if !s.bytes().all(|b| b"IOTSZJL".contains(&b)) {
                                return Err(self.error("COMPACT_RELATION_REQUIRES_STANDARD_IDS"));
                            }
                        }
                        for a in left.chars() {
                            for b in right.chars() {
                                let (earlier, later) =
                                    if (op == b'<') != (self.profile == LEGACY_PROFILE) {
                                        (a, b)
                                    } else {
                                        (b, a)
                                    };
                                all.push(Value::Call(Call::new(
                                    "before",
                                    vec![
                                        Value::Text(earlier.to_string()),
                                        Value::Text(later.to_string()),
                                    ],
                                )));
                                if all.len() > MAX_PREDICATES {
                                    return Err(self.error("PREDICATE_LIMIT"));
                                }
                            }
                        }
                        left = right;
                    }
                    Ok(Value::Call(Call::new("all", all)))
                } else {
                    Ok(match id.as_str() {
                        "true" => Value::Bool(true),
                        "false" => Value::Bool(false),
                        _ => Value::Symbol(id),
                    })
                }
            }
            None => Err(self.error("UNEXPECTED_END")),
        }
    }
    fn call(&mut self, name: String, depth: usize) -> Result<Call> {
        self.expect(b'(')?;
        let mut args = Vec::new();
        let mut named = BTreeMap::new();
        if self.peek() != Some(b')') {
            loop {
                let start = self.at;
                let key = self.ident().ok();
                if key.is_some() && self.peek() == Some(b'=') {
                    self.at += 1;
                    let val = self.value(depth + 1)?;
                    if named.insert(key.unwrap_or_default(), val).is_some() {
                        return Err(self.error("DUPLICATE_ARGUMENT"));
                    }
                } else {
                    self.at = start;
                    if !named.is_empty() {
                        return Err(self.error("POSITIONAL_AFTER_NAMED"));
                    }
                    args.push(self.value(depth + 1)?);
                }
                if self.peek() != Some(b',') {
                    break;
                }
                self.at += 1;
            }
        }
        self.expect(b')')?;
        Ok(Call { name, args, named })
    }
}

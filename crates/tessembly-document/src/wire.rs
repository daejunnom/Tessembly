//! TSDC document wire v1. Little-endian lengths, tagged values, nested TSMB pattern ASTs.
//! No source text is reparsed when decoding. Unknown critical sections fail closed.
use std::collections::{BTreeMap, BTreeSet};
use tessembly_core::{Error, Result, MAX_DEPTH, MAX_INPUT, MAX_NODES, MAX_PREDICATES};
use crate::{Call, Document, NamedPredicate, Value};
const MAGIC: &[u8;6] = b"TSDC\x01\x02";
const LIMIT: usize = 1_048_576;
fn put(out: &mut Vec<u8>, bytes: &[u8]) -> Result<()> {
    if out.len().saturating_add(bytes.len()) > LIMIT { return Err(Error::new("BINARY_LIMIT")); }
    out.extend_from_slice(bytes); Ok(())
}
fn number(out: &mut Vec<u8>, n: usize) -> Result<()> {
    put(out,&u32::try_from(n).map_err(|_| Error::new("INTEGER_OVERFLOW"))?.to_le_bytes())
}
fn bytes(out: &mut Vec<u8>, b: &[u8]) -> Result<()> { number(out,b.len())?; put(out,b) }
fn string(out: &mut Vec<u8>, s: &str) -> Result<()> { bytes(out,s.as_bytes()) }
fn value(out: &mut Vec<u8>, v: &Value) -> Result<()> {
    match v {
        Value::Bool(b) => put(out,&[u8::from(*b)]),
        Value::Number(n) => { put(out,&[2])?; put(out,&n.to_le_bytes()) },
        Value::Text(s) | Value::Symbol(s) => { put(out,&[if matches!(v,Value::Text(_)) {3} else {4}])?; string(out,s) },
        Value::List(xs) => { put(out,&[5])?; values(out,xs) },
        Value::Call(c) => {
            put(out,&[6])?; string(out,&c.name)?; values(out,&c.args)?; mapping(out,&c.named)
        }
        Value::Pattern(n) => {
            put(out,&[7])?;
            bytes(out,&tessembly_codec::encode(&tessembly_codec::Document { root:*n.clone(),optional_extensions:vec![] })?)
        }
    }
}
fn values(out: &mut Vec<u8>, xs: &[Value]) -> Result<()> {
    number(out,xs.len())?; for x in xs { value(out,x)?; } Ok(())
}
fn mapping(out: &mut Vec<u8>, map: &BTreeMap<String,Value>) -> Result<()> {
    number(out,map.len())?; for (k,v) in map { string(out,k)?; value(out,v)?; } Ok(())
}
fn predicates(out: &mut Vec<u8>, ps: &[NamedPredicate]) -> Result<()> {
    number(out,ps.len())?;
    for p in ps { match p {
        NamedPredicate::Present(a) => { put(out,&[0])?; string(out,a)?; }
        NamedPredicate::Before(a,b) => { put(out,&[1])?; string(out,a)?; string(out,b)?; }
    }} Ok(())
}
fn calls(out: &mut Vec<u8>, cs: &[Call]) -> Result<()> {
    number(out,cs.len())?; for c in cs { value(out,&Value::Call(c.clone()))?; } Ok(())
}
pub fn encode(doc: &Document) -> Result<Vec<u8>> {
    doc.validate()?;
    let mut body = Vec::new(); mapping(&mut body,&doc.config)?;
    value(&mut body,doc.source.as_ref().ok_or_else(|| Error::new("SUPPLY_REQUIRED"))?)?;
    predicates(&mut body,&doc.draw)?; predicates(&mut body,&doc.use_order)?;
    calls(&mut body,&doc.references)?; calls(&mut body,&doc.decisions)?;
    let mut out = MAGIC.to_vec(); number(&mut out,1 + doc.optional_extensions.len())?;
    number(&mut out,1)?; put(&mut out,&[1])?; bytes(&mut out,&body)?;
    for e in &doc.optional_extensions { put(&mut out,&e.id.to_le_bytes())?; put(&mut out,&[0])?; bytes(&mut out,&e.bytes)?; }
    Ok(out)
}
struct Reader<'a> { b: &'a [u8], at: usize, nodes: usize }
impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8]> {
        let end = self.at.checked_add(n).ok_or_else(|| Error::new("BINARY_LIMIT"))?;
        let value = self.b.get(self.at..end).ok_or_else(|| Error::new("TRUNCATED_BINARY"))?;
        self.at = end; Ok(value)
    }
    fn byte(&mut self) -> Result<u8> { Ok(self.take(1)?[0]) }
    fn number(&mut self) -> Result<usize> {
        let a: [u8;4] = self.take(4)?.try_into().map_err(|_| Error::new("TRUNCATED_BINARY"))?;
        usize::try_from(u32::from_le_bytes(a)).map_err(|_|Error::new("INTEGER_OVERFLOW"))
    }
    fn bytes(&mut self) -> Result<&'a [u8]> { let n = self.number()?; self.take(n) }
    fn string(&mut self) -> Result<String> {
        let b = self.bytes()?;
        if b.len() > MAX_INPUT { return Err(Error::new("INPUT_LIMIT")); }
        String::from_utf8(b.to_vec()).map_err(|_| Error::new("INVALID_UTF8"))
    }
    fn count(&mut self, max: usize) -> Result<usize> {
        let n = self.number()?; if n > max { return Err(Error::new("DOCUMENT_LIMIT")); } Ok(n)
    }
    fn values(&mut self, depth: usize) -> Result<Vec<Value>> {
        let count = self.count(MAX_NODES)?; let mut out = Vec::new();
        for _ in 0..count { out.push(self.value(depth + 1)?); } Ok(out)
    }
    fn mapping(&mut self, depth: usize) -> Result<BTreeMap<String,Value>> {
        let count = self.count(MAX_NODES)?; let mut out = BTreeMap::new();
        for _ in 0..count {
            let key = self.string()?; let val = self.value(depth + 1)?;
            if out.insert(key,val).is_some() { return Err(Error::new("DUPLICATE_KEY")); }
        } Ok(out)
    }
    fn value(&mut self, depth: usize) -> Result<Value> {
        self.nodes += 1;
        if depth > MAX_DEPTH || self.nodes > MAX_NODES { return Err(Error::new("DOCUMENT_LIMIT")); }
        Ok(match self.byte()? {
            0 => Value::Bool(false), 1 => Value::Bool(true),
            2 => Value::Number(u64::from_le_bytes(self.take(8)?.try_into().map_err(|_| Error::new("TRUNCATED_BINARY"))?)),
            3 => Value::Text(self.string()?), 4 => Value::Symbol(self.string()?),
            5 => Value::List(self.values(depth)?),
            6 => Value::Call(Call { name:self.string()?,args:self.values(depth)?,named:self.mapping(depth)? }),
            7 => {
                let doc = tessembly_codec::decode(self.bytes()?)?;
                if !doc.optional_extensions.is_empty() { return Err(Error::new("NESTED_METADATA_NOT_SUPPORTED")); }
                Value::Pattern(Box::new(doc.root))
            }
            _ => return Err(Error::new("UNKNOWN_VALUE_TAG")),
        })
    }
    fn predicates(&mut self) -> Result<Vec<NamedPredicate>> {
        let n = self.count(MAX_PREDICATES)?; let mut out = Vec::new();
        for _ in 0..n { out.push(match self.byte()? {
            0 => NamedPredicate::Present(self.string()?),
            1 => NamedPredicate::Before(self.string()?,self.string()?),
            _ => return Err(Error::new("UNKNOWN_RELATION_TAG")),
        }); } Ok(out)
    }
    fn calls(&mut self) -> Result<Vec<Call>> {
        let n = self.count(MAX_NODES)?; let mut out = Vec::new();
        for _ in 0..n { match self.value(0)? {
            Value::Call(c) => out.push(c), _ => return Err(Error::new("EXPECTED_CALL")),
        }} Ok(out)
    }
}
pub fn decode(bytes: &[u8]) -> Result<Document> {
    if bytes.len() > LIMIT { return Err(Error::new("BINARY_LIMIT")); }
    if bytes.get(..6) != Some(MAGIC.as_slice()) { return Err(Error::new("UNSUPPORTED_DOCUMENT_WIRE")); }
    let mut r = Reader { b:bytes,at:6,nodes:0 }; let count = r.count(65)?;
    let mut ids = BTreeSet::new(); let mut result = None; let mut extensions = Vec::new();
    for _ in 0..count {
        let id = r.number()? as u32; let flags = r.byte()?;
        if flags > 1 { return Err(Error::new("INVALID_SECTION_FLAGS")); }
        if !ids.insert(id) { return Err(Error::new("DUPLICATE_SECTION")); }
        let b = r.bytes()?;
        if id == 1 {
            if flags != 1 { return Err(Error::new("DOCUMENT_SECTION_MUST_BE_CRITICAL")); }
            let mut b = Reader { b,at:0,nodes:0 };
            let doc = Document { config:b.mapping(0)?,source:Some(b.value(0)?),draw:b.predicates()?,use_order:b.predicates()?,
                references:b.calls()?,decisions:b.calls()?,optional_extensions:vec![] };
            if b.at != b.b.len() { return Err(Error::new("TRAILING_BINARY")); }
            result = Some(doc);
        } else if flags == 1 { return Err(Error::new("UNSUPPORTED_CRITICAL_EXTENSION")); }
        else { extensions.push(tessembly_codec::Extension { id,bytes:b.to_vec() }); }
    }
    if r.at != bytes.len() { return Err(Error::new("TRAILING_BINARY")); }
    let mut doc = result.ok_or_else(|| Error::new("DOCUMENT_SECTION_REQUIRED"))?;
    doc.optional_extensions = extensions; doc.validate()?; Ok(doc)
}

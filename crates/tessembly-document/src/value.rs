use std::collections::BTreeMap;
use tessembly_core::{Error, Node, Result};

/// Data expressions, never executable host code. Patterns retain their parsed AST.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Value {
    Bool(bool),
    Number(u64),
    Text(String),
    Symbol(String),
    List(Vec<Value>),
    Call(Call),
    Pattern(Box<Node>),
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Call {
    pub name: String,
    pub args: Vec<Value>,
    pub named: BTreeMap<String, Value>,
}
impl Call {
    pub fn new(name: &str, args: Vec<Value>) -> Self {
        Self {
            name: name.into(),
            args,
            named: BTreeMap::new(),
        }
    }
    pub fn keys(&self, allowed: &[&str]) -> Result<()> {
        if self.named.keys().any(|k| !allowed.contains(&k.as_str())) {
            return Err(Error::new("UNKNOWN_ARGUMENT"));
        }
        Ok(())
    }
    pub fn arity(&self, n: usize) -> Result<()> {
        if self.args.len() != n {
            return Err(Error::new("ARGUMENT_COUNT"));
        }
        Ok(())
    }
}
impl Value {
    pub fn text(&self) -> Result<&str> {
        match self {
            Self::Text(s) | Self::Symbol(s) => Ok(s),
            _ => Err(Error::new("EXPECTED_TEXT")),
        }
    }
    pub fn number(&self) -> Result<u64> {
        if let Self::Number(n) = self {
            Ok(*n)
        } else {
            Err(Error::new("EXPECTED_NUMBER"))
        }
    }
    pub fn boolean(&self) -> Result<bool> {
        if let Self::Bool(b) = self {
            Ok(*b)
        } else {
            Err(Error::new("EXPECTED_BOOLEAN"))
        }
    }
    pub fn list(&self) -> Result<&[Value]> {
        if let Self::List(v) = self {
            Ok(v)
        } else {
            Err(Error::new("EXPECTED_LIST"))
        }
    }
    pub fn call(&self) -> Result<&Call> {
        if let Self::Call(c) = self {
            Ok(c)
        } else {
            Err(Error::new("EXPECTED_CALL"))
        }
    }
}
pub(crate) fn quote(text: &str) -> String {
    let mut out = String::from("\"");
    for c in text.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    out.push('"');
    out
}
pub(crate) fn display(v: &Value) -> Result<String> {
    Ok(match v {
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Text(s) => quote(s),
        Value::Symbol(s) => s.clone(),
        Value::List(xs) => format!(
            "[{}]",
            xs.iter()
                .map(display)
                .collect::<Result<Vec<_>>>()?
                .join(", ")
        ),
        Value::Pattern(n) => format!("pattern({})", quote(&tessembly_text::format(n)?)),
        Value::Call(c) => {
            let mut args = c.args.iter().map(display).collect::<Result<Vec<_>>>()?;
            for (k, v) in &c.named {
                args.push(format!("{k}={}", display(v)?));
            }
            format!("{}({})", c.name, args.join(", "))
        }
    })
}

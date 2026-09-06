//! Advanced declarations and structural interchange, not a solver or dataset client.
#![forbid(unsafe_code)]
pub mod config;
mod parser;
mod source;
mod value;
mod schema;
mod render;
pub mod wire;
pub use parser::parse;
pub use value::{Call, Value};
use std::collections::BTreeMap;
use tessembly_core::{Constraints, Error, Node, NodeKind, Piece, Predicate, PredicateKind, Result, Span};

pub const DOCUMENT_SCHEMA: &str = "tessembly.document.v1";
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum NamedPredicate { Present(String), Before(String,String) }
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Document {
    pub config: BTreeMap<String,Value>,
    pub source: Option<Value>,
    pub draw: Vec<NamedPredicate>,
    pub use_order: Vec<NamedPredicate>,
    pub references: Vec<Call>,
    pub decisions: Vec<Call>,
    pub optional_extensions: Vec<tessembly_codec::Extension>,
}
impl Document {
    pub fn empty() -> Self {
        Self { config:BTreeMap::new(),source:None,draw:vec![],use_order:vec![],references:vec![],decisions:vec![],optional_extensions:vec![] }
    }
    pub fn validate(&self) -> Result<()> { schema::validate(self) }
    pub fn source_length(&self) -> Result<Option<usize>> {
        self.validate()?;
        source::validate_source(self.source.as_ref().ok_or_else(|| Error::new("SUPPLY_REQUIRED"))?,&config::registry(&self.config)?)
    }
    pub fn with_host_config(&self, host: &BTreeMap<String,Value>) -> Result<Self> {
        self.validate()?; let mut d = self.clone(); d.config = config::resolve(&self.config,host)?; d.validate()?; Ok(d)
    }
    /// Pattern projection only. The caller must keep the environment with the returned pattern.
    pub fn standard_pattern(&self) -> Result<Node> {
        self.validate()?;
        let Some(Value::Pattern(n)) = &self.source else { return Err(Error::new("SOURCE_REQUIRES_HOST")); };
        fn predicates(ps: &[NamedPredicate]) -> Result<Option<Vec<Predicate>>> {
            let piece = |id: &str| {
                if id.len() != 1 { return Err(Error::new("CUSTOM_RELATION_REQUIRES_HOST")); }
                Piece::from_ascii(id.as_bytes()[0])
            };
            if ps.is_empty() { return Ok(None); }
            ps.iter().map(|p| Ok(Predicate { span:Span::default(), kind:match p {
                NamedPredicate::Present(a) => PredicateKind::Present(piece(a)?),
                NamedPredicate::Before(a,b) => PredicateKind::Before(piece(a)?,piece(b)?),
            }})).collect::<Result<Vec<_>>>().map(Some)
        }
        let root = Node { kind:NodeKind::Scope(n.clone()), span:Span::default(), constraints:Constraints {
            draw:predicates(&self.draw)?,use_order:predicates(&self.use_order)? } };
        root.validate()?; Ok(root)
    }
    pub fn to_text(&self) -> Result<String> { render::text(self) }
    pub fn requirements(&self) -> Result<Vec<String>> { render::requirements(self) }
}

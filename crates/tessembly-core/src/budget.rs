//! Cumulative decoded-model budget, shared across embedded ASTs and declarations.
use crate::{Error, Result, MAX_INPUT, MAX_NODES, MAX_PREDICATES};
#[derive(Default, Debug)]
pub struct ModelBudget {
    nodes: usize,
    predicates: usize,
    text_bytes: usize,
}
impl ModelBudget {
    fn charge(value: &mut usize, n: usize, limit: usize, code: &'static str) -> Result<()> {
        if n > limit.saturating_sub(*value) {
            return Err(Error::new(code));
        }
        *value += n;
        Ok(())
    }
    pub fn nodes(&mut self, n: usize) -> Result<()> {
        Self::charge(&mut self.nodes, n, MAX_NODES, "NODE_LIMIT")
    }
    pub fn predicates(&mut self, n: usize) -> Result<()> {
        Self::charge(&mut self.predicates, n, MAX_PREDICATES, "PREDICATE_LIMIT")
    }
    pub fn text(&mut self, n: usize) -> Result<()> {
        Self::charge(&mut self.text_bytes, n, MAX_INPUT, "DOCUMENT_TEXT_LIMIT")
    }
}

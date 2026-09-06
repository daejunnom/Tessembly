//! Immutable environment, intentionally outside the compact supply grammar.
use crate::{Error, Result};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Environment { entries: BTreeMap<String, String> }
impl Environment {
    /// Keys are opaque, versioned host configuration keys. Values are not executed.
    pub fn from_entries(entries: impl IntoIterator<Item=(String, String)>) -> Result<Self> {
        let mut map = BTreeMap::new();
        for (key, value) in entries {
            if key.is_empty() { return Err(Error::new("EMPTY_CONFIG_KEY")); }
            if map.insert(key, value).is_some() { return Err(Error::new("DUPLICATE_CONFIG_KEY")); }
        }
        Ok(Self { entries: map })
    }
    pub fn entries(&self) -> &BTreeMap<String, String> { &self.entries }
    /// No defaults are silently applied to documents or old fragments.
    pub fn resolve(document: Option<&Self>, host: Option<&Self>) -> Result<Self> {
        match (document, host) {
            (Some(a), Some(b)) if a != b => Err(Error::new("CONFIG_CONFLICT")),
            (Some(a), _) | (_, Some(a)) => Ok(a.clone()),
            (None, None) => Err(Error::new("ENVIRONMENT_REQUIRED")),
        }
    }
}

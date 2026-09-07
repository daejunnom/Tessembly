use crate::{config, source, Call, Document, NamedPredicate, Value};
use std::collections::BTreeSet;
use tessembly_core::budget::ModelBudget;
use tessembly_core::{Error, Result, MAX_DEPTH, MAX_INPUT};

pub(crate) fn validate(doc: &Document) -> Result<()> {
    let mut budget = ModelBudget::default();
    for key in doc.config.keys() {
        budget.text(key.len())?;
    }
    for value in doc.config.values().chain(doc.source.iter()) {
        bounded(value, 0, &mut budget)?;
    }
    for call in doc.references.iter().chain(&doc.decisions) {
        bounded_call(call, 0, &mut budget)?;
    }
    let registry = config::registry(&doc.config)?;
    config::validate(&doc.config, &registry)?;
    let source_len = source::validate_source(
        doc.source
            .as_ref()
            .ok_or_else(|| Error::new("SUPPLY_REQUIRED"))?,
        &registry,
    )?;
    for (ps, selectors) in [(&doc.draw, true), (&doc.use_order, false)] {
        for p in ps {
            let mut check = |s: &String, budget: &mut ModelBudget| -> Result<()> {
                budget.text(s.len())?;
                if registry.contains(s) {
                    Ok(())
                } else {
                    Err(Error::new("UNREGISTERED_PIECE"))
                }
            };
            match p {
                NamedPredicate::Present(a) => {
                    budget.predicates(1)?;
                    check(a, &mut budget)?;
                }
                NamedPredicate::Before(a, b) => {
                    budget.predicates(1)?;
                    check(a, &mut budget)?;
                    check(b, &mut budget)?;
                }
                NamedPredicate::Filter(f) => {
                    f.validate_with(&mut budget, source_len, selectors, &mut check)?
                }
            }
        }
    }
    let mut refs = BTreeSet::new();
    for r in &doc.references {
        if r.name != "reference" {
            return Err(Error::new("INVALID_REFERENCE"));
        }
        r.arity(1)?;
        r.keys(&["format", "value", "page", "revision"])?;
        let id = r.args[0].text()?;
        if id.is_empty() || !refs.insert(id) {
            return Err(Error::new("DUPLICATE_REFERENCE"));
        }
        for k in ["format", "value"] {
            if r.named
                .get(k)
                .ok_or_else(|| Error::new("REFERENCE_FIELD_REQUIRED"))?
                .text()?
                .is_empty()
            {
                return Err(Error::new("REFERENCE_FIELD_REQUIRED"));
            }
        }
        if let Some(v) = r.named.get("page") {
            v.number()?;
        }
        if let Some(v) = r.named.get("revision") {
            v.text()?;
        }
    }
    let mut targets = BTreeSet::new();
    for d in &doc.decisions {
        if d.name != "select" {
            return Err(Error::new("INVALID_DECISION"));
        }
        d.arity(1)?;
        d.keys(&["at", "choices"])?;
        if d.args[0].text()?.is_empty() || !targets.insert(d.args[0].text()?) {
            return Err(Error::new("DUPLICATE_DECISION_TARGET"));
        }
        let at = d
            .named
            .get("at")
            .ok_or_else(|| Error::new("DECISION_TIMES_REQUIRED"))?
            .list()?;
        if at.is_empty() {
            return Err(Error::new("DECISION_TIMES_REQUIRED"));
        }
        let mut prev = None;
        for x in at {
            let n = x.number()?;
            if n > tessembly_core::MAX_DRAWS as u64 || prev.is_some_and(|p| p >= n) {
                return Err(Error::new("INVALID_DECISION_TIME"));
            }
            prev = Some(n);
        }
        let choices = d
            .named
            .get("choices")
            .ok_or_else(|| Error::new("DECISION_CHOICES_REQUIRED"))?
            .list()?;
        if choices.is_empty() {
            return Err(Error::new("DECISION_CHOICES_REQUIRED"));
        }
        for id in choices {
            if !refs.contains(id.text()?) {
                return Err(Error::new("UNRESOLVED_REFERENCE"));
            }
        }
    }
    let mut ext = BTreeSet::new();
    let mut bytes = 0usize;
    if doc.optional_extensions.len() > 64 {
        return Err(Error::new("EXTENSION_LIMIT"));
    }
    for e in &doc.optional_extensions {
        bytes = bytes
            .checked_add(e.bytes.len())
            .ok_or_else(|| Error::new("BINARY_LIMIT"))?;
        if bytes > 1_048_576 {
            return Err(Error::new("BINARY_LIMIT"));
        }
        if e.id == 1 || !ext.insert(e.id) {
            return Err(Error::new("DUPLICATE_EXTENSION"));
        }
    }
    Ok(())
}
fn identifier(s: &str) -> bool {
    !s.is_empty()
        && s.bytes()
            .enumerate()
            .all(|(i, b)| b.is_ascii_alphabetic() || b == b'_' || (i > 0 && b.is_ascii_digit()))
}
fn bounded_call(c: &Call, depth: usize, count: &mut ModelBudget) -> Result<()> {
    count.text(c.name.len())?;
    for key in c.named.keys() {
        count.text(key.len())?;
    }
    if !identifier(&c.name) || c.named.keys().any(|k| !identifier(k)) {
        return Err(Error::new("INVALID_IDENTIFIER"));
    }
    count.nodes(1)?;
    if depth > MAX_DEPTH {
        return Err(Error::new("DOCUMENT_LIMIT"));
    }
    for v in c.args.iter().chain(c.named.values()) {
        bounded(v, depth + 1, count)?;
    }
    Ok(())
}
fn bounded(v: &Value, depth: usize, count: &mut ModelBudget) -> Result<()> {
    count.nodes(1)?;
    if depth > MAX_DEPTH {
        return Err(Error::new("DOCUMENT_LIMIT"));
    }
    match v {
        Value::Symbol(s) if !identifier(s) => return Err(Error::new("INVALID_IDENTIFIER")),
        Value::Text(s)
            if s.len() > MAX_INPUT
                || s.chars()
                    .any(|c| c.is_control() && !matches!(c, '\n' | '\r' | '\t')) =>
        {
            return Err(Error::new("INVALID_STRING"))
        }
        Value::Text(s) | Value::Symbol(s) => {
            count.text(s.len())?;
        }
        Value::List(xs) => {
            for x in xs {
                bounded(x, depth + 1, count)?;
            }
        }
        Value::Call(c) => bounded_call(c, depth + 1, count)?,
        Value::Pattern(n) => {
            n.validate_with_budget(count)?;
        }
        _ => {}
    }
    Ok(())
}

/// Bound public typed settings before cloning or recursive interpretation.
pub(crate) fn bounded_config(config: &std::collections::BTreeMap<String, Value>) -> Result<()> {
    let mut budget = ModelBudget::default();
    for (key, value) in config {
        budget.text(key.len())?;
        bounded(value, 0, &mut budget)?;
    }
    Ok(())
}

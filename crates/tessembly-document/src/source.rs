use crate::{Call, Value};
use std::collections::BTreeSet;
use tessembly_core::{Error, Result, MAX_DRAWS};

pub(crate) fn ids(value: &Value, registry: &BTreeSet<String>) -> Result<Vec<String>> {
    let out: Vec<String> = match value {
        Value::Text(s) => {
            if !s.bytes().all(|b| b"IOTSZJL".contains(&b)) {
                return Err(Error::new("USE_LIST_FOR_CUSTOM_IDS"));
            }
            s.chars().map(|c| c.to_string()).collect()
        }
        Value::List(xs) => xs
            .iter()
            .map(|v| v.text().map(str::to_owned))
            .collect::<Result<_>>()?,
        _ => return Err(Error::new("EXPECTED_PIECE_LIST")),
    };
    if out.is_empty() || out.len() > MAX_DRAWS {
        return Err(Error::new("PIECE_LIST_LIMIT"));
    }
    for id in &out {
        if !registry.contains(id) {
            return Err(Error::new("UNREGISTERED_PIECE"));
        }
    }
    Ok(out)
}
pub(crate) fn external(c: &Call) -> Result<()> {
    c.arity(1)?;
    c.keys(&["revision", "parameters", "initial", "length"])?;
    if c.args[0].text()?.is_empty() {
        return Err(Error::new("EXTERNAL_ID_REQUIRED"));
    }
    if c.named
        .get("revision")
        .ok_or_else(|| Error::new("EXTERNAL_REVISION_REQUIRED"))?
        .text()?
        .is_empty()
    {
        return Err(Error::new("EXTERNAL_REVISION_REQUIRED"));
    }
    fn data(v: &Value) -> Result<()> {
        match v {
            Value::Call(_) | Value::Pattern(_) => Err(Error::new("EXTERNAL_PARAMETERS_ARE_DATA")),
            Value::List(xs) => {
                for x in xs {
                    data(x)?;
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
    for key in ["parameters", "initial"] {
        if let Some(v) = c.named.get(key) {
            data(v)?;
        }
    }
    if let Some(v) = c.named.get("length") {
        positive(v)?;
    }
    Ok(())
}
pub(crate) fn positive(v: &Value) -> Result<usize> {
    let n = v.number()?;
    if n == 0 || n > MAX_DRAWS as u64 {
        return Err(Error::new("DRAW_LIMIT"));
    }
    Ok(n as usize)
}
/// Length is None only for declared unbounded streams. No random draw is performed.
pub(crate) fn validate_source(v: &Value, registry: &BTreeSet<String>) -> Result<Option<usize>> {
    if let Value::Pattern(n) = v {
        return Ok(Some(n.validate()?));
    }
    let c = v.call()?;
    match c.name.as_str() {
        "queue" | "shuffle" | "bag" | "pool" => {
            c.arity(1)?;
            let weighted = matches!(c.name.as_str(), "bag" | "pool");
            c.keys(if weighted { &["weights"] } else { &[] })?;
            let pieces = ids(&c.args[0], registry)?;
            if let Some(weights) = c.named.get("weights") {
                let ws = weights.list()?;
                if ws.len() != pieces.len() {
                    return Err(Error::new("WEIGHT_COUNT"));
                }
                for w in ws {
                    let n = w.number()?;
                    if n == 0 || n > u32::MAX as u64 {
                        return Err(Error::new("INVALID_WEIGHT"));
                    }
                }
            }
            Ok(if weighted { None } else { Some(pieces.len()) })
        }
        "take" | "repeat" => {
            c.arity(2)?;
            c.keys(&[])?;
            let count = positive(&c.args[0])?;
            let len = validate_source(&c.args[1], registry)?;
            if c.name == "take" {
                if len.is_some_and(|n| count > n) {
                    return Err(Error::new("TAKE_EXCEEDS_FINITE_SOURCE"));
                }
                Ok(Some(count))
            } else {
                let n = len.ok_or_else(|| Error::new("REPEAT_REQUIRES_FINITE_SOURCE"))?;
                let n = n
                    .checked_mul(count)
                    .filter(|n| *n <= MAX_DRAWS)
                    .ok_or_else(|| Error::new("DRAW_LIMIT"))?;
                Ok(Some(n))
            }
        }
        "concat" | "either" => {
            c.keys(&[])?;
            if c.args.is_empty() {
                return Err(Error::new("EMPTY_SOURCE"));
            }
            let mut total = Some(0usize);
            let mut first: Option<Option<usize>> = None;
            for (i, child) in c.args.iter().enumerate() {
                let len = validate_source(child, registry)?;
                if c.name == "either" {
                    if first.is_some_and(|a| a != len) {
                        return Err(Error::new("MIXED_SEQUENCE_LENGTHS"));
                    }
                    first = Some(len);
                    total = len;
                } else {
                    if len.is_none() && i + 1 != c.args.len() {
                        return Err(Error::new("UNREACHABLE_SOURCE_SUFFIX"));
                    }
                    total = match (total, len) {
                        (Some(a), Some(b)) => a.checked_add(b),
                        _ => None,
                    };
                }
                if total.is_some_and(|n| n > MAX_DRAWS) {
                    return Err(Error::new("DRAW_LIMIT"));
                }
            }
            Ok(total)
        }
        "external" => {
            external(c)?;
            c.named.get("length").map(positive).transpose()
        }
        _ => Err(Error::new("UNSUPPORTED_SOURCE_DECLARATION")),
    }
}

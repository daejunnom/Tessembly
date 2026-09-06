use std::collections::{BTreeMap, BTreeSet};
use tessembly_core::{Error, Piece, Result, MAX_DRAWS};
use tessembly_core::hold::{HoldPolicy, HoldState, Slot, Tail, Token};
use crate::{Call, Value};
use crate::source::{external, ids};

pub(crate) fn registry(config: &BTreeMap<String,Value>) -> Result<BTreeSet<String>> {
    let mut set: BTreeSet<String> = "IOTSZJL".chars().map(|c| c.to_string()).collect();
    if let Some(v) = config.get("registry") {
        for id in v.list()? {
            let id = id.text()?;
            if id.is_empty() || id.len() > 128 || id.chars().any(char::is_control) { return Err(Error::new("INVALID_PIECE_ID")); }
            if !set.insert(id.into()) { return Err(Error::new("DUPLICATE_PIECE_ID")); }
        }
    }
    Ok(set)
}
fn enum_value(v: &Value, choices: &[&str]) -> Result<()> {
    if !choices.contains(&v.text()?) { return Err(Error::new("INVALID_SETTING")); } Ok(())
}
fn token_check(v: &Value, registry: &BTreeSet<String>) -> Result<()> {
    let c = v.call()?; if c.name != "token" { return Err(Error::new("EXPECTED_TOKEN")); }
    c.arity(1)?; c.keys(&["origin"])?;
    if !registry.contains(c.args[0].text()?) { return Err(Error::new("UNREGISTERED_PIECE")); }
    c.named.get("origin").ok_or_else(|| Error::new("ORIGIN_REQUIRED"))?.number()?; Ok(())
}
fn observation(c: &Call) -> Result<()> {
    match c.name.as_str() {
        "all" => { c.arity(0)?; c.keys(&[])?; }
        "view" => {
            c.arity(0)?; c.keys(&["active","next","hold","memory","reveal","bag"])?;
            for key in ["active","hold"] { if let Some(v) = c.named.get(key) { v.boolean()?; } }
            if let Some(v) = c.named.get("next") { if v.number()? > MAX_DRAWS as u64 { return Err(Error::new("VIEW_LIMIT")); } }
            if let Some(v) = c.named.get("memory") { enum_value(v,&["history","current"])?; }
            if let Some(v) = c.named.get("reveal") { enum_value(v,&["supply","lock","host"])?; }
            if let Some(v) = c.named.get("bag") { enum_value(v,&["known","hidden"])?; }
        }
        "external" => external(c)?,
        _ => return Err(Error::new("UNSUPPORTED_OBSERVATION_DECLARATION")),
    }
    Ok(())
}
pub(crate) fn validate(config: &BTreeMap<String,Value>, registry: &BTreeSet<String>) -> Result<()> {
    for (key, v) in config {
        match key.as_str() {
            "registry" => {},
            "rule" => {
                if v.text().ok() == Some("from_source") { continue; }
                let c = v.call()?;
                match c.name.as_str() {
                    "seven_bag" => { c.arity(0)?; c.keys(&[])?; }
                    "external" => external(c)?,
                    _ => return Err(Error::new("UNSUPPORTED_RULE_DECLARATION")),
                }
            }
            "start" => {
                let c = v.call()?;
                match c.name.as_str() {
                    "boundary" => { c.arity(0)?; c.keys(&[])?; }
                    "remainder" => {
                        c.arity(1)?; c.keys(&["epoch"])?; ids(&c.args[0],registry)?;
                        if let Some(n) = c.named.get("epoch") { n.number()?; }
                        if config.get("rule").and_then(|v|v.call().ok()).is_some_and(|r|r.name == "seven_bag") {
                            let ps = ids(&c.args[0],registry)?;
                            let unique: BTreeSet<_> = ps.iter().collect();
                            if unique.len() != ps.len() || ps.iter().any(|p|p.len()!=1 || !b"IOTSZJL".contains(&p.as_bytes()[0])) {
                                return Err(Error::new("INVALID_SEVEN_BAG_REMAINDER"));
                            }
                        }
                    }
                    "external" => external(c)?,
                    _ => return Err(Error::new("UNSUPPORTED_START_DECLARATION")),
                }
            }
            "see" => observation(v.call()?)?,
            "hold" => {
                let c = v.call()?;
                match c.name.as_str() {
                    "none" => { c.arity(0)?; c.keys(&[])?; }
                    "slot" => {
                        c.arity(0)?; c.keys(&["initial","used","allowed","deny"])?;
                        let initial = c.named.get("initial").ok_or_else(|| Error::new("HOLD_INITIAL_REQUIRED"))?;
                        if initial.text().ok() != Some("empty") { token_check(initial,registry)?; }
                        for key in ["used","allowed"] { if let Some(v) = c.named.get(key) { v.boolean()?; } }
                        if let Some(v) = c.named.get("deny") {
                            let ps = ids(v,registry)?; let unique: BTreeSet<_> = ps.iter().collect();
                            if ps.len() != unique.len() { return Err(Error::new("DUPLICATE_HOLD_RULE")); }
                        }
                    }
                    "external" => external(c)?,
                    _ => return Err(Error::new("UNSUPPORTED_HOLD_DECLARATION")),
                }
            }
            "active" => token_check(v,registry)?,
            "queue" => {
                let xs = v.list()?;
                if xs.len() > MAX_DRAWS { return Err(Error::new("DRAW_LIMIT")); }
                for x in xs { token_check(x,registry)?; }
            }
            "cursor" => { if v.number()? > MAX_DRAWS as u64 { return Err(Error::new("INVALID_CURSOR")); } }
            "tail" => enum_value(v,&["pending","end"] )?,
            _ => return Err(Error::new("UNKNOWN_CONFIG_KEY")),
        }
    }
    Ok(())
}
/// Merge missing fields only. Conflicts are never resolved by declaration order.
pub fn resolve(document: &BTreeMap<String,Value>, host: &BTreeMap<String,Value>) -> Result<BTreeMap<String,Value>> {
    let mut result = host.clone();
    for (k,v) in document {
        if result.get(k).is_some_and(|old|old != v) { return Err(Error::new("CONFIG_CONFLICT")); }
        result.insert(k.clone(),v.clone());
    }
    for key in ["rule","start","see","hold"] {
        if !result.contains_key(key) { return Err(Error::new("CONFIG_REQUIRED")); }
    }
    validate(&result,&registry(&result)?)?; Ok(result)
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct View {
    pub active: bool, pub next: usize, pub hold: bool,
    pub memory: String, pub reveal: String, pub bag: String,
}
/// None means see-inf. Defaults belong to document schema v1, not to an external see-7 alias.
pub fn view(v: &Value) -> Result<Option<View>> {
    let c = v.call()?; observation(c)?;
    if c.name == "all" { return Ok(None); }
    if c.name != "view" { return Err(Error::new("UNSUPPORTED_OBSERVATION_PROFILE")); }
    let boolean = |key, default| c.named.get(key).map(Value::boolean).transpose().map(|v|v.unwrap_or(default));
    let text = |key, default: &str| c.named.get(key).map(Value::text).transpose().map(|v|v.unwrap_or(default).to_owned());
    Ok(Some(View { active:boolean("active",true)?, next:c.named.get("next").map(Value::number).transpose()?.unwrap_or(5) as usize,
        hold:boolean("hold",true)?, memory:text("memory","history")?, reveal:text("reveal","supply")?, bag:text("bag","known")? }))
}
fn piece(id: &str) -> Result<Piece> {
    if id.len() != 1 { return Err(Error::new("UNSUPPORTED_CUSTOM_PIECE_EXECUTION")); }
    Piece::from_ascii(id.as_bytes()[0])
}
fn token(v: &Value) -> Result<Token> {
    let c = v.call()?;
    Ok(Token { kind:piece(c.args.first().ok_or_else(|| Error::new("EXPECTED_TOKEN"))?.text()?)?,
        origin:c.named.get("origin").ok_or_else(|| Error::new("ORIGIN_REQUIRED"))?.number()? })
}
pub fn hold_policy(config: &BTreeMap<String,Value>) -> Result<HoldPolicy> {
    validate(config,&registry(config)?)?;
    let c = config.get("hold").ok_or_else(|| Error::new("CONFIG_REQUIRED"))?.call()?;
    if c.name == "none" { return HoldPolicy::new(false,[]); }
    if c.name != "slot" { return Err(Error::new("UNSUPPORTED_HOLD_PROFILE")); }
    let allowed = c.named.get("allowed").map(Value::boolean).transpose()?.unwrap_or(true);
    let deny = c.named.get("deny").map(|v| ids(v,&registry(config)?)).transpose()?.unwrap_or_default();
    let overrides = deny.iter().map(|s|piece(s).map(|p|(p,false))).collect::<Result<Vec<_>>>()?;
    HoldPolicy::new(allowed,overrides)
}
/// Supply-only mapping for an explicitly provided state. No fabricated hold or origin.
pub fn hold_state(config: &BTreeMap<String,Value>) -> Result<HoldState> {
    validate(config,&registry(config)?)?;
    let get = |k| config.get(k).ok_or_else(|| Error::new("STATE_REQUIRED"));
    let c = get("hold")?.call()?;
    let held = match c.name.as_str() {
        "none" => Slot::None,
        "slot" => {
            let initial = c.named.get("initial").ok_or_else(|| Error::new("HOLD_INITIAL_REQUIRED"))?;
            if initial.text().ok() == Some("empty") { Slot::Empty } else { Slot::Occupied(token(initial)?) }
        }
        _ => return Err(Error::new("UNSUPPORTED_HOLD_PROFILE")),
    };
    let s = HoldState { active:token(get("active")?)?, held,
        used_this_turn:c.named.get("used").map(Value::boolean).transpose()?.unwrap_or(false),
        queue:get("queue")?.list()?.iter().map(token).collect::<Result<_>>()?, cursor:get("cursor")?.number()? as usize,
        tail:if get("tail")?.text()? == "end" { Tail::End } else { Tail::Pending } };
    s.validate()?; Ok(s)
}

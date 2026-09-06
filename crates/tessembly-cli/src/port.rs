use crate::expand::{self, Budget};
use serde_json::{json, Value};
use tessembly_core::hold::{HoldPolicy, HoldState, HoldSupport, Slot, Tail, Token};
use tessembly_core::{Error, Piece, Result, PROFILE, PROTOCOL};

fn string<'a>(v: &'a Value, key: &str) -> Result<&'a str> {
    v.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| Error::new("INVALID_REQUEST"))
}
fn boolean(v: &Value, key: &str) -> Result<bool> {
    v.get(key)
        .and_then(Value::as_bool)
        .ok_or_else(|| Error::new("INVALID_REQUEST"))
}
fn uint(v: &Value, key: &str) -> Result<usize> {
    let n = v
        .get(key)
        .and_then(Value::as_u64)
        .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
    usize::try_from(n).map_err(|_| Error::new("INTEGER_OVERFLOW"))
}
fn keys(v: &Value, allowed: &[&str]) -> Result<()> {
    let map = v.as_object().ok_or_else(|| Error::new("INVALID_REQUEST"))?;
    if map.keys().any(|k| !allowed.contains(&k.as_str())) {
        return Err(Error::new("UNKNOWN_FIELD"));
    }
    Ok(())
}
fn piece(s: &str) -> Result<Piece> {
    if s.len() != 1 {
        return Err(Error::new("INVALID_PIECE"));
    }
    Piece::from_ascii(s.as_bytes()[0])
}
fn token(v: &Value) -> Result<Token> {
    keys(v, &["piece", "origin"])?;
    Ok(Token {
        kind: piece(string(v, "piece")?)?,
        origin: v
            .get("origin")
            .and_then(Value::as_u64)
            .ok_or_else(|| Error::new("INVALID_ORIGIN"))?,
    })
}
fn slot(v: &Value) -> Result<Slot> {
    match v.as_str() {
        Some("NONE") => Ok(Slot::None),
        Some("EMPTY") => Ok(Slot::Empty),
        Some(_) => Err(Error::new("INVALID_HOLD_SLOT")),
        None => Ok(Slot::Occupied(token(v)?)),
    }
}
fn token_json(t: Token) -> Value {
    json!({"piece":t.kind.to_string(),"origin":t.origin})
}
fn slot_json(s: Slot) -> Value {
    match s {
        Slot::None => json!("NONE"),
        Slot::Empty => json!("EMPTY"),
        Slot::Occupied(t) => token_json(t),
    }
}
fn state(v: &Value) -> Result<HoldState> {
    keys(
        v,
        &[
            "active",
            "held",
            "used_this_turn",
            "queue",
            "cursor",
            "tail",
        ],
    )?;
    let queue = v
        .get("queue")
        .and_then(Value::as_array)
        .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
    if queue.len() > tessembly_core::MAX_DRAWS {
        return Err(Error::new("DRAW_LIMIT"));
    }
    let state = HoldState {
        active: token(&v["active"])?,
        held: slot(&v["held"])?,
        used_this_turn: boolean(v, "used_this_turn")?,
        queue: queue.iter().map(token).collect::<Result<_>>()?,
        cursor: uint(v, "cursor")?,
        tail: match string(v, "tail")? {
            "PENDING" => Tail::Pending,
            "END" => Tail::End,
            _ => return Err(Error::new("INVALID_TAIL")),
        },
    };
    state.validate()?;
    Ok(state)
}
fn state_json(s: &HoldState) -> Value {
    json!({"active":token_json(s.active),"held":slot_json(s.held),"used_this_turn":s.used_this_turn,
        "queue":s.queue.iter().copied().map(token_json).collect::<Vec<_>>(),"cursor":s.cursor,
        "tail":if s.tail == Tail::End {"END"} else {"PENDING"}})
}
fn policy(v: Option<&Value>) -> Result<HoldPolicy> {
    let Some(v) = v else {
        return Ok(HoldPolicy::default());
    };
    keys(v, &["allowed", "rules"])?;
    let allowed = boolean(v, "allowed")?;
    let entries = v["rules"]
        .as_array()
        .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
    let mut rules = Vec::new();
    for rule in entries {
        keys(rule, &["when_active", "allowed"])?;
        rules.push((
            piece(string(rule, "when_active")?)?,
            boolean(rule, "allowed")?,
        ));
    }
    HoldPolicy::new(allowed, rules)
}
fn budget(v: &Value) -> Result<Budget> {
    let limit = match v.get("budget") {
        None => 500_000,
        Some(_) => uint(v, "budget")?,
    };
    if !(1..=1_000_000).contains(&limit) {
        return Err(Error::new("INVALID_BUDGET"));
    }
    Ok(Budget {
        steps: 0,
        remaining: limit,
    })
}
fn status(code: &str) -> &'static str {
    match code {
        "UNSUPPORTED_PROFILE"
        | "UNSUPPORTED_OPERATION"
        | "UNSUPPORTED_USE_IN_DRAW_ENUMERATION"
        | "UNSUPPORTED_CRITICAL_EXTENSION"
        | "UNSUPPORTED_WIRE_OR_PROFILE" => "UNSUPPORTED",
        "UNSUPPORTED_STATE" => "UNSUPPORTED_STATE",
        "INCOMPLETE" => "INCOMPLETE",
        "CONFIG_CONFLICT" => "CONFIG_CONFLICT",
        "DUPLICATE_CONFIG_KEY" | "DUPLICATE_HOLD_RULE" => "INVALID_DOCUMENT",
        _ => "INVALID_REQUEST",
    }
}
pub fn response(req: &Value) -> Value {
    let id = req.get("id").cloned().unwrap_or(Value::Null);
    let result = handle(req);
    let mut out = match result {
        Ok(v) => v,
        Err(e) => {
            json!({"status":status(e.code),"complete":false,"error":{"code":e.code,"start":e.span.start,"end":e.span.end}})
        }
    };
    out["id"] = id;
    out["protocol"] = json!(PROTOCOL);
    out["profile"] = json!(PROFILE);
    out
}
fn handle(req: &Value) -> Result<Value> {
    if string(req, "protocol")? != PROTOCOL {
        return Err(Error::new("UNSUPPORTED_OPERATION"));
    }
    if string(req, "profile")? != PROFILE {
        return Err(Error::new("UNSUPPORTED_PROFILE"));
    }
    if !req.get("id").is_some_and(|v| v.is_string() || v.is_u64()) {
        return Err(Error::new("INVALID_REQUEST"));
    }
    let op = string(req, "op")?;
    let mut allowed = vec!["id", "protocol", "profile", "op"];
    allowed.extend(match op {
        "capabilities" => vec![],
        "compile" | "format" | "encode" => vec!["text"],
        "enumerate_D" => vec!["text", "budget"],
        "evaluate_U_witness" => vec!["text", "queue", "order", "closed", "budget"],
        "decode" => vec!["hex"],
        "hold_step" => vec!["state", "policy", "action"],
        "check_adapter" => vec!["held", "supported"],
        "resolve_config" => vec!["document", "host"],
        _ => return Err(Error::new("UNSUPPORTED_OPERATION")),
    });
    keys(req, &allowed)?;
    match op {
        "capabilities" => {
            return Ok(json!({"status":"OK","complete":true,
            "operations":["compile","format","encode","decode","enumerate_D","evaluate_U_witness","hold_step","check_adapter","resolve_config"],
            "wire":"tessembly.ast-wire.v1.experimental","enumeration":"bounded-development-only",
            "limits":{"input_bytes":tessembly_core::MAX_INPUT,"max_draws":tessembly_core::MAX_DRAWS,"max_work":1000000},
            "not_implemented":["rfc1-migration","config-text","full-game-legality","see-n-policy-evaluation","custom-piece-codec","clearra-adapter","hf-lookup","gui-e2e","replay"]}))
        }
        "hold_step" => {
            let mut s = state(&req["state"])?;
            let p = policy(req.get("policy"))?;
            let action = string(req, "action")?;
            let result = match action {
                "hold" => s.swap(&p),
                "advance_after_lock" => s.advance_after_lock(),
                _ => return Err(Error::new("UNSUPPORTED_OPERATION")),
            };
            return Ok(match result {
                Ok(()) => {
                    json!({"status":"OK","complete":true,"domain":"hold-supply","state":state_json(&s),"placement_legality_checked":false})
                }
                Err(e) => {
                    json!({"status":if e.code == "NEEDS_SUPPLY" {"NOT_CHECKED"} else {"REJECTED_ACTION"},
                    "complete":e.code != "NEEDS_SUPPLY","reason":e.code,"state":state_json(&s),"placement_legality_checked":false})
                }
            });
        }
        "check_adapter" => {
            let list = req["supported"]
                .as_array()
                .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
            if list
                .iter()
                .any(|v| !matches!(v.as_str(), Some("NONE" | "EMPTY" | "OCCUPIED")))
            {
                return Err(Error::new("INVALID_REQUEST"));
            }
            let has = |s: &str| list.iter().any(|v| v.as_str() == Some(s));
            HoldSupport {
                none: has("NONE"),
                empty: has("EMPTY"),
                occupied: has("OCCUPIED"),
            }
            .check(slot(&req["held"])?)?;
            return Ok(json!({"status":"OK","complete":true,"mapping_performed":false}));
        }
        "resolve_config" => {
            fn environment(v: &Value) -> Result<Option<tessembly_core::config::Environment>> {
                if v.is_null() {
                    return Ok(None);
                }
                let a = v.as_array().ok_or_else(|| Error::new("INVALID_REQUEST"))?;
                let mut entries = Vec::new();
                for e in a {
                    let pair = e
                        .as_array()
                        .filter(|a| a.len() == 2)
                        .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
                    entries.push((
                        pair[0]
                            .as_str()
                            .ok_or_else(|| Error::new("INVALID_REQUEST"))?
                            .to_owned(),
                        pair[1]
                            .as_str()
                            .ok_or_else(|| Error::new("INVALID_REQUEST"))?
                            .to_owned(),
                    ));
                }
                Ok(Some(tessembly_core::config::Environment::from_entries(
                    entries,
                )?))
            }
            let doc = environment(&req["document"])?;
            let host = environment(&req["host"])?;
            let env = tessembly_core::config::Environment::resolve(doc.as_ref(), host.as_ref())?;
            return Ok(
                json!({"status":"OK","complete":true,"entries":env.entries(),"values_executed":false}),
            );
        }
        "decode" => {
            let bytes = unhex(string(req, "hex")?)?;
            let doc = tessembly_codec::decode(&bytes)?;
            return Ok(
                json!({"status":"OK","complete":true,"normalized":tessembly_text::format(&doc.root)?,
                "optional_extensions_preserved":doc.optional_extensions.len(),"reencoded_hex":hex(&tessembly_codec::encode(&doc)?)}),
            );
        }
        _ => {}
    }
    let root = match tessembly_text::parse(string(req, "text")?, PROFILE) {
        Ok(n) => n,
        Err(e) => {
            return Ok(
                json!({"status":if e.code.ends_with("LIMIT") {"INCOMPLETE"} else {"INVALID_SYNTAX"},
            "complete":false,"error":{"code":e.code,"start":e.span.start,"end":e.span.end}}),
            )
        }
    };
    match op {
        "compile" | "format" => {
            let a = tessembly_relations::analyze(&root);
            Ok(
                json!({"status":"OK","complete":true,"normalized":tessembly_text::format(&root)?,
                "draw_feasibility":if a.draw_unsat {"UNSAT"} else {"NOT_CHECKED"},
                "execution_feasibility":if a.execution_unsat {"UNSAT"} else {"NOT_CHECKED"},
                "diagnostics":a.diagnostics.iter().map(|d| json!({"domain":if d.domain == tessembly_relations::Domain::Draw {"draw"} else {"use"},
                    "code":"PRECEDENCE_CYCLE","scope":{"start":d.scope.start,"end":d.scope.end},"cycle":tessembly_core::letters(&d.cycle.pieces),
                    "spans":d.cycle.spans.iter().map(|s|json!({"start":s.start,"end":s.end})).collect::<Vec<_>>() })).collect::<Vec<_>>() }),
            )
        }
        "enumerate_D" => {
            let mut b = budget(req)?;
            let qs = expand::draw_queues(&root, &mut b)?;
            Ok(
                json!({"status":"OK","complete":true,"domain":"draw-language","count":qs.len(),
                "queues":qs.iter().map(|q|tessembly_core::letters(q)).collect::<Vec<_>>(),"work":b.steps,"bag_legality_checked":false}),
            )
        }
        "evaluate_U_witness" => {
            let queue = tessembly_core::pieces(string(req, "queue")?)?;
            if queue.len() > tessembly_core::MAX_DRAWS {
                return Err(Error::new("DRAW_LIMIT"));
            }
            let indices = req["order"]
                .as_array()
                .ok_or_else(|| Error::new("INVALID_REQUEST"))?;
            let order = indices
                .iter()
                .map(|v| {
                    v.as_u64()
                        .and_then(|v| usize::try_from(v).ok())
                        .ok_or_else(|| Error::new("INVALID_SOURCE_INDICES"))
                })
                .collect::<Result<Vec<_>>>()?;
            let closed = boolean(req, "closed")?;
            let result = expand::check_use(&root, &queue, &order, closed, &mut budget(req)?)?;
            Ok(
                json!({"status":if result.is_some() {"OK"} else {"NOT_CHECKED"},"complete":result.is_some(),"matches":result,
                "domain":"usage-relations","legality_checked":false}),
            )
        }
        "encode" => {
            let doc = tessembly_codec::Document {
                root,
                optional_extensions: Vec::new(),
            };
            Ok(json!({"status":"OK","complete":true,"hex":hex(&tessembly_codec::encode(&doc)?)}))
        }
        _ => Err(Error::new("UNSUPPORTED_OPERATION")),
    }
}
pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::new();
    for byte in bytes {
        out.push(DIGITS[usize::from(byte >> 4)] as char);
        out.push(DIGITS[usize::from(byte & 15)] as char);
    }
    out
}
pub fn unhex(s: &str) -> Result<Vec<u8>> {
    if s.len() > 2_100_000 || s.len() % 2 != 0 || !s.is_ascii() {
        return Err(Error::new("INVALID_HEX"));
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|_| Error::new("INVALID_HEX")))
        .collect()
}

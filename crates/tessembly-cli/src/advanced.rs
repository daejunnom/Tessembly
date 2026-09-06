use std::{collections::BTreeMap, fs, io::{self, BufRead, Read, Write}};
use serde_json::{json, Value};
use tessembly_core::{Error, Result, PROFILE};
use tessembly_document::{config, parse, wire, Document, DOCUMENT_SCHEMA};
const PROTOCOL: &str = "tessembly.document-test-port.v1";
fn text(path: &str) -> Result<String> {
    String::from_utf8(crate::read_file(path,tessembly_core::MAX_INPUT)?).map_err(|_|Error::new("INVALID_UTF8"))
}
fn report(d: &Document) -> Result<Value> {
    let feasibility = match d.standard_pattern() {
        Ok(n) => {
            let a = tessembly_relations::analyze(&n);
            json!({"draw":if a.draw_unsat {"UNSAT"} else {"NOT_CHECKED"},"use":if a.execution_unsat {"UNSAT"} else {"NOT_CHECKED"}})
        }
        Err(_) => json!({"draw":"NOT_CHECKED","use":"NOT_CHECKED"}),
    };
    Ok(json!({"status":"OK","complete":true,"schema":DOCUMENT_SCHEMA,"profile":PROFILE,
        "normalized":d.to_text()?,"source_length":d.source_length()?,"required_capabilities":d.requirements()?,
        "environment_resolved":config::resolve(&d.config,&BTreeMap::new()).is_ok(),
        "feasibility":feasibility,"execution_checked":false,"external_data_accessed":false}))
}
fn str_field<'a>(v: &'a Value, key: &str) -> Result<&'a str> {
    v.get(key).and_then(Value::as_str).ok_or_else(||Error::new("INVALID_REQUEST"))
}
fn handle(req: &Value) -> Result<Value> {
    if str_field(req,"protocol")? != PROTOCOL || str_field(req,"profile")? != PROFILE { return Err(Error::new("UNSUPPORTED_PROFILE")); }
    if !req.get("id").is_some_and(|v|v.is_string() || v.is_u64()) { return Err(Error::new("INVALID_REQUEST")); }
    let op = str_field(req,"op")?;
    let extra: &[&str] = match op {
        "capabilities" => &[], "validate"|"roundtrip"|"project" => &["text"],
        "decode" => &["hex"], "hold" => &["text","action"], "resolve" => &["text","host"],
        _ => return Err(Error::new("UNSUPPORTED_OPERATION")),
    };
    let map = req.as_object().ok_or_else(||Error::new("INVALID_REQUEST"))?;
    for key in map.keys() { if !["id","protocol","profile","op"].contains(&key.as_str()) && !extra.contains(&key.as_str()) { return Err(Error::new("UNKNOWN_FIELD")); } }
    if op == "capabilities" { return Ok(json!({"status":"OK","complete":true,"schema":DOCUMENT_SCHEMA,
        "operations":["validate","roundtrip","project","decode","hold","resolve"],"intended_user":"external-integrator",
        "does_not_execute":["pc-search","observation-policy","dataset-lookup","references","custom-randomizers","replay"]})); }
    if op == "decode" {
        let d = wire::decode(&crate::port::unhex(str_field(req,"hex")?)?)?;
        return Ok(json!({"status":"OK","complete":true,"hex":crate::port::hex(&wire::encode(&d)?),
            "optional_extensions":d.optional_extensions.len(),"schema":DOCUMENT_SCHEMA}));
    }
    let d = parse(str_field(req,"text")?)?;
    match op {
        "validate" => report(&d),
        "roundtrip" => {
            let b = wire::encode(&d)?; let back = wire::decode(&b)?;
            let mut r = report(&back)?; r["structurally_equal"] = json!(d == back); r["hex"] = json!(crate::port::hex(&b)); Ok(r)
        }
        "project" => Ok(json!({"status":"OK","complete":true,"pattern":tessembly_text::format(&d.standard_pattern()?)?,
            "projection_only":true,"environment":d.to_text()?,"execution_checked":false})),
        "resolve" => { let h = parse(str_field(req,"host")?)?; report(&d.with_host_config(&h.config)?) }
        "hold" => {
            let mut s = config::hold_state(&d.config)?; let p = config::hold_policy(&d.config)?;
            let before = s.clone();
            let result = match str_field(req,"action")? {
                "hold" => s.swap(&p), "advance_after_lock" => s.advance_after_lock(), _ => return Err(Error::new("UNSUPPORTED_OPERATION")),
            };
            let reason = result.err().map(|e|e.code);
            let pending = reason == Some("NEEDS_SUPPLY");
            let held = match s.held {
                tessembly_core::hold::Slot::None => json!("NONE"), tessembly_core::hold::Slot::Empty => json!("EMPTY"),
                tessembly_core::hold::Slot::Occupied(t) => json!({"piece":t.kind.to_string(),"origin":t.origin}),
            };
            Ok(json!({"status":if pending {"NOT_CHECKED"} else if reason.is_none() {"OK"} else {"REJECTED_ACTION"},"complete":!pending,
                "reason":reason,"unchanged":s == before,
                "active":s.active.kind.to_string(),"active_origin":s.active.origin,"held":held,
                "cursor":s.cursor,"used_this_turn":s.used_this_turn,"placement_checked":false}))
        }
        _ => Err(Error::new("UNSUPPORTED_OPERATION")),
    }
}
fn error_status(code: &str) -> &'static str {
    if code == "UNSUPPORTED_STATE" { "UNSUPPORTED_STATE" }
    else if code.starts_with("UNSUPPORTED") || code.ends_with("REQUIRES_HOST") { "UNSUPPORTED" }
    else if code == "CONFIG_CONFLICT" { "CONFIG_CONFLICT" }
    else if matches!(code,"CONFIG_REQUIRED"|"STATE_REQUIRED") { "NOT_CHECKED" }
    else if code.ends_with("LIMIT") { "INCOMPLETE" }
    else if matches!(code,"INVALID_REQUEST"|"UNKNOWN_FIELD") { "INVALID_REQUEST" }
    else { "INVALID_DOCUMENT" }
}
pub fn response(req: &Value) -> Value {
    let mut out = match handle(req) {
        Ok(v) => v,
        Err(e) => json!({"status":error_status(e.code),"complete":false,
            "error":{"code":e.code,"start":e.span.start,"end":e.span.end}}),
    };
    out["id"] = req.get("id").cloned().unwrap_or(Value::Null); out["protocol"] = json!(PROTOCOL); out["profile"] = json!(PROFILE); out
}
fn port() -> Result<()> {
    let stdin = io::stdin(); let mut input = stdin.lock(); let stdout = io::stdout(); let mut output = stdout.lock();
    loop {
        let mut line = Vec::new(); let n = (&mut input).take(2_200_001).read_until(b'\n',&mut line).map_err(|_|Error::new("READ_FAILED"))?;
        if n == 0 { break; } if n > 2_200_000 { return Err(Error::new("REQUEST_LIMIT")); }
        let out = match serde_json::from_slice::<Value>(&line) {
            Ok(req) => response(&req), Err(_) => json!({"id":null,"protocol":PROTOCOL,"profile":PROFILE,"status":"INVALID_REQUEST","complete":false}),
        };
        serde_json::to_writer(&mut output,&out).map_err(|_|Error::new("WRITE_FAILED"))?;
        output.write_all(b"\n").and_then(|_|output.flush()).map_err(|_|Error::new("WRITE_FAILED"))?;
    } Ok(())
}
pub fn run(command: &str, args: Vec<String>) -> Result<u8> {
    if command == "doc-port" { if !args.is_empty() { return Err(Error::new("INVALID_ARGUMENTS")); } port()?; return Ok(0); }
    if command == "doc-decode" {
        if args.len() != 2 { return Err(Error::new("INVALID_ARGUMENTS")); }
        let d = wire::decode(&crate::read_file(&args[0],1_048_576)?)?;
        let rendered = d.to_text()?; fs::write(&args[1],rendered).map_err(|_|Error::new("WRITE_FAILED"))?; return Ok(0);
    }
    if command == "doc-encode" {
        if args.len() != 2 { return Err(Error::new("INVALID_ARGUMENTS")); }
        let d = parse(&text(&args[0])?)?;
        fs::write(&args[1],wire::encode(&d)?).map_err(|_|Error::new("WRITE_FAILED"))?; return Ok(0);
    }
    if !matches!(command,"doc-check"|"doc-format") { return Err(Error::new("INVALID_ARGUMENTS")); }
    let deny = args.iter().any(|s|s == "--deny-unsat"); let mut exit = 0; let mut files = 0;
    for path in &args {
        if path == "--deny-unsat" { continue; }
        if path.starts_with('-') { return Err(Error::new("INVALID_ARGUMENTS")); }
        files += 1; let d = parse(&text(path)?)?;
        if command == "doc-format" { print!("{}",d.to_text()?); }
        else { let r = report(&d)?; if deny && (r["feasibility"]["draw"] == "UNSAT" || r["feasibility"]["use"] == "UNSAT") { exit = 1; } println!("{r}"); }
    }
    if files == 0 { return Err(Error::new("INVALID_ARGUMENTS")); } Ok(exit)
}

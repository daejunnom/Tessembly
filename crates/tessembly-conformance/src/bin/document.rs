//! External-integrator tool. Only talks to the supplied host process; imports no product parser.
#![forbid(unsafe_code)]
use serde_json::{json, Value};
use std::{env, fs, process::ExitCode, time::Duration};
const PROFILE: &str = "tessembly.rfc2.precedence.v1";
const PROTOCOL: &str = "tessembly.document-test-port.v1";
fn doc(body: &str) -> String {
    format!("tessembly \"{PROFILE}\";\n{body}")
}
fn request(argv: &[String], mut input: Value, id: usize) -> Result<Value, String> {
    input["id"] = json!(id);
    input["protocol"] = json!(PROTOCOL);
    input["profile"] = json!(PROFILE);
    let bytes = tessembly_conformance::exchange(
        argv,
        format!("{input}\n").into_bytes(),
        Duration::from_secs(10),
    )?;
    let v: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    if v["id"] != id || v["protocol"] != PROTOCOL || v["profile"] != PROFILE {
        return Err("ENVELOPE_MISMATCH".into());
    }
    Ok(v)
}
struct Runner {
    argv: Vec<String>,
    results: Vec<Value>,
}
impl Runner {
    fn test(
        &mut self,
        name: &str,
        req: Value,
        predicate: impl FnOnce(&Value) -> bool,
    ) -> Option<Value> {
        let response = request(&self.argv, req, self.results.len());
        let (ok, detail) = match &response {
            Ok(v) => (predicate(v), v.clone()),
            Err(e) => (false, json!({"transport_error":e})),
        };
        eprintln!("{} {name}", if ok { "PASS" } else { "FAIL" });
        self.results
            .push(json!({"name":name,"passed":ok,"failure":if ok {Value::Null} else {detail}}));
        response.ok()
    }
}
fn run(r: &mut Runner) {
    r.test(
        "external document capabilities",
        json!({"op":"capabilities"}),
        |v| v["status"] == "OK" && v["intended_user"] == "external-integrator",
    );
    let simple = doc("supply(\"P4\"); draw(I<TS,I);");
    r.test(
        "advanced relations are declarations",
        json!({"op":"validate","text":simple}),
        |v| {
            v["source_length"] == 4
                && v["execution_checked"] == false
                && v["external_data_accessed"] == false
        },
    );
    let a = r.test(
        "mixed chain projection",
        json!({"op":"project","text":doc("supply(\"P4\"); draw(I<T>S);")}),
        |v| v["status"] == "OK" && v["projection_only"] == true,
    );
    r.test(
        "group projection equals mixed chain",
        json!({"op":"project","text":doc("supply(\"P4\"); draw(T>IS);")}),
        |v| a.as_ref().is_some_and(|a| a["pattern"] == v["pattern"]),
    );
    r.test(
        "global cycle detected",
        json!({"op":"validate","text":doc("supply(\"P7\"); draw(I<T<O<I);")}),
        |v| v["feasibility"]["draw"] == "UNSAT",
    );
    r.test(
        "use cycle does not empty supply",
        json!({"op":"validate","text":doc("supply(\"P7\"); use(I<T<O<I);")}),
        |v| v["feasibility"]["draw"] == "NOT_CHECKED" && v["feasibility"]["use"] == "UNSAT",
    );
    for (name, body) in [
        (
            "duplicate config",
            "config { see=all();see=all(); } supply(\"I\");",
        ),
        ("duplicate supply", "supply(\"I\");supply(\"T\");"),
        ("unknown config", "config { typo=all(); } supply(\"I\");"),
        ("zero weight", "supply(take(4,bag(\"IT\",weights=[0,1])));"),
        ("short finite source", "supply(take(4,queue(\"IT\")));"),
        (
            "unresolved selection",
            "supply(\"I\");select(\"setup\",at=[0],choices=[\"missing\"]);",
        ),
        ("revision required", "supply(external(\"host.rule\"));"),
    ] {
        r.test(name, json!({"op":"validate","text":doc(body)}), |v| {
            v["status"] == "INVALID_DOCUMENT" && v["complete"] == false
        });
    }
    let custom = doc("config { registry=[\"PENTO_P\"];rule=from_source; } supply(take(8,bag([\"I\",\"PENTO_P\",\"PENTO_P\"],weights=[1,2,2])));draw(before(\"PENTO_P\",\"I\"));");
    let roundtrip = r.test(
        "custom data wire roundtrip",
        json!({"op":"roundtrip","text":custom}),
        |v| {
            v["structurally_equal"] == true
                && v["source_length"] == 8
                && v["external_data_accessed"] == false
                && v["normalized"]
                    .as_str()
                    .is_some_and(|s| s.contains("PENTO_P") && s.contains("weights=[1, 2, 2]"))
        },
    );
    r.test(
        "custom source not coerced to standard",
        json!({"op":"project","text":custom}),
        |v| v["status"] == "UNSUPPORTED",
    );
    if let Some(hex) = roundtrip.as_ref().and_then(|v| v["hex"].as_str()) {
        r.test(
            "binary reencoding preserves structure",
            json!({"op":"decode","hex":hex}),
            |v| v["status"] == "OK" && v["hex"] == hex,
        );
        r.test(
            "truncated binary rejected",
            json!({"op":"decode","hex":&hex[..hex.len()-2]}),
            |v| v["complete"] == false,
        );
    }
    let host = doc("config { rule=seven_bag();start=boundary();see=view(next=5);hold=none(); } supply(\"P7\");");
    r.test(
        "host resolves missing environment",
        json!({"op":"resolve","text":simple,"host":host}),
        |v| v["environment_resolved"] == true,
    );
    r.test(
        "host does not override conflicting view",
        json!({"op":"resolve","text":doc("config { see=all(); } supply(\"I\");"),"host":host}),
        |v| v["status"] == "CONFIG_CONFLICT",
    );
    let state = |hold: &str, tail: &str, queue: &str| {
        doc(&format!("config {{ hold={hold};active=token(\"I\",origin=10);queue={queue};cursor=0;tail={tail}; }} supply(\"IO\");"))
    };
    let queue = "[token(\"O\",origin=11)]";
    r.test(
        "empty consumes actual next",
        json!({"op":"hold","action":"hold","text":state("slot(initial=empty)","end",queue)}),
        |v| v["active"] == "O" && v["cursor"] == 1 && v["used_this_turn"] == true,
    );
    r.test(
        "none remains unavailable",
        json!({"op":"hold","action":"hold","text":state("none()","end",queue)}),
        |v| v["reason"] == "HOLD_UNAVAILABLE" && v["unchanged"] == true,
    );
    r.test("locked held token cannot be selected",json!({"op":"hold","action":"hold","text":state("slot(initial=token(\"T\",origin=12),used=true)","end",queue)}),|v|v["reason"]=="HOLD_USED_THIS_TURN" && v["unchanged"]==true);
    r.test("advanced deny checks active",json!({"op":"hold","action":"hold","text":state("slot(initial=empty,deny=[\"I\"])","end",queue)}),|v|v["reason"]=="HOLD_POLICY_DENIED" && v["unchanged"]==true);
    r.test(
        "pending supply is not ended",
        json!({"op":"hold","action":"hold","text":state("slot(initial=empty)","pending","[]")}),
        |v| v["status"] == "NOT_CHECKED" && v["complete"] == false && v["unchanged"] == true,
    );
    r.test("external refs never auto-fetched",json!({"op":"roundtrip","text":doc("supply(\"P7\");reference(\"A\",format=\"ctk3\",value=\"consumer-owned\");select(\"setup\",at=[0,2],choices=[\"A\"]);")}),|v|v["external_data_accessed"]==false && v["normalized"].as_str().is_some_and(|s|s.contains("consumer-owned") && s.contains("select(")));
}
fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let Some(split) = args.iter().position(|s| s == "--") else {
        eprintln!("usage: tessembly-document-tck [--report FILE] -- TRUSTED-HOST [ARGS...]");
        return ExitCode::from(2);
    };
    let report = match &args[..split] {
        [] => None,
        [flag, path] if flag == "--report" => Some(path),
        _ => {
            eprintln!("invalid arguments");
            return ExitCode::from(2);
        }
    };
    let argv = args[split + 1..].to_vec();
    if argv.is_empty() {
        return ExitCode::from(2);
    }
    let mut r = Runner {
        argv,
        results: vec![],
    };
    run(&mut r);
    let passed = r.results.iter().filter(|v| v["passed"] == true).count();
    let result = json!({"protocol":PROTOCOL,"profile":PROFILE,"total":r.results.len(),"passed":passed,"scope":"external-integrator document contracts, not dataset or GUI certification","results":r.results});
    if let Some(path) = report {
        if let Err(e) = fs::write(path, serde_json::to_vec_pretty(&result).unwrap_or_default()) {
            eprintln!("{e}");
            return ExitCode::from(2);
        }
    }
    println!("{result}");
    ExitCode::from(u8::from(
        passed != result["total"].as_u64().unwrap_or(0) as usize,
    ))
}

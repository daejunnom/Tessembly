//! Black-box conformance runner. The host command must be trusted; this is not a sandbox.
#![forbid(unsafe_code)]
mod oracle;
use oracle::{before, set};
use serde_json::{json, Value};
use std::{collections::BTreeSet, env, time::Duration};
const PROFILE: &str = "tessembly.rfc3.order.v1";
const PROTOCOL: &str = "tessembly.test-port.v1";

fn request(command: &[String], mut req: Value, id: usize) -> Result<Value, String> {
    req["id"] = json!(id);
    req["protocol"] = json!(PROTOCOL);
    if req.get("profile").is_none() {
        req["profile"] = json!(PROFILE);
    }
    let bytes = tessembly_conformance::exchange(
        command,
        format!("{req}\n").into_bytes(),
        Duration::from_secs(10),
    )?;
    let response: Value =
        serde_json::from_slice(&bytes).map_err(|e| format!("invalid/surplus JSON: {e}"))?;
    if response["id"] != id || response["protocol"] != PROTOCOL || response["profile"] != PROFILE {
        return Err("response envelope mismatch".into());
    }
    Ok(response)
}
struct Runner {
    command: Vec<String>,
    results: Vec<Value>,
    aborted: bool,
}
impl Runner {
    fn test(
        &mut self,
        name: &str,
        req: Value,
        check: impl FnOnce(&Value) -> bool,
    ) -> Option<Value> {
        if self.aborted {
            return None;
        }
        let response = request(&self.command, req, self.results.len());
        self.aborted = response.is_err();
        let (pass, detail) = match &response {
            Ok(v) => (
                check(v),
                json!({"response_preview": tessembly_conformance::response_preview(v)}),
            ),
            Err(e) => (false, json!({"transport_error":e})),
        };
        eprintln!("{} {name}", if pass { "PASS" } else { "FAIL" });
        self.results
            .push(json!({"name":name,"passed":pass,"failure":if pass {Value::Null} else {detail}}));
        response.ok()
    }
    fn queues(&mut self, name: &str, text: &str, expected: BTreeSet<String>) {
        self.test(name, json!({"op":"enumerate_D","text":text}), move |v| {
            let Some(a) = v["queues"].as_array() else {
                return false;
            };
            let actual: BTreeSet<_> = a
                .iter()
                .filter_map(|v| v.as_str().map(str::to_owned))
                .collect();
            v["status"] == "OK"
                && v["complete"] == true
                && actual.len() == a.len()
                && v["count"] == a.len()
                && actual == expected
        });
    }
}
fn strings(a: &[&str]) -> BTreeSet<String> {
    a.iter().map(|s| s.to_string()).collect()
}
fn hold_state(held: Value) -> Value {
    json!({"active":{"piece":"I","origin":10},"held":held,"used_this_turn":false,
        "queue":[{"piece":"O","origin":12}],"cursor":0,"tail":"END"})
}
fn run(r: &mut Runner) {
    r.test("capabilities", json!({"op":"capabilities"}), |v| {
        v["status"] == "OK" && v["complete"] == true
    });
    r.queues("P4 baseline", "P4", set(4, |_| true));
    // Concrete sentinels catch reversals that a 360-vs-360 cardinality check cannot.
    for (pattern, expected) in [
        ("{IT}:D(I<T)", vec!["IT"]),
        ("{TI}:D(I<T)", vec![]),
        ("{IOSZ}:D(I<T)", vec!["IOSZ"]),
        ("{TOSZ}:D(I<T)", vec![]),
        ("{OSZJ}:D(I<T)", vec![]),
        ("{IST}:D(I<T>S)", vec!["IST"]),
        ("{TIS}:D(I<T>S)", vec![]),
        ("{ITIT}:D(I<T)", vec!["ITIT"]),
    ] {
        r.queues(pattern, pattern, strings(&expected));
    }
    r.test(
        "RFC2 requires explicit migration",
        json!({"op":"compile","profile":"tessembly.rfc2.precedence.v1","text":"P4:D(I<T)"}),
        |v| v["status"] == "UNSUPPORTED",
    );

    r.queues("presence T", "P4:D(T)", set(4, |s| s.contains('T')));
    r.queues(
        "presence TS all",
        "P4:D(TS)",
        set(4, |s| s.contains('T') && s.contains('S')),
    );
    r.queues(
        "RFC3 greater means right first",
        "P4:D(I>T)",
        set(4, |s| before(s, b'T', b'I')),
    );
    r.queues(
        "redundant presence",
        "P4:D(I>T,T)",
        set(4, |s| before(s, b'T', b'I')),
    );
    r.queues(
        "later presence",
        "P4:D(I>T,I)",
        set(4, |s| before(s, b'T', b'I') && s.contains('I')),
    );
    r.queues(
        "less means left first",
        "P4:D(I<T,T)",
        set(4, |s| before(s, b'I', b'T') && s.contains('T')),
    );
    r.queues(
        "group predecessors",
        "P4:D(I>TS)",
        set(4, |s| before(s, b'T', b'I') && before(s, b'S', b'I')),
    );
    r.queues(
        "group successors",
        "P4:D(T<IS)",
        set(4, |s| before(s, b'T', b'I') && before(s, b'T', b'S')),
    );
    r.queues(
        "mixed chain",
        "P4:D(I>T<S)",
        set(4, |s| before(s, b'T', b'I') && before(s, b'T', b'S')),
    );
    r.queues(
        "group order irrelevant",
        "P4:D(I>ST)",
        set(4, |s| before(s, b'T', b'I') && before(s, b'S', b'I')),
    );
    r.queues(
        "comma equivalence",
        "P4:D(I>T,I>S)",
        set(4, |s| before(s, b'T', b'I') && before(s, b'S', b'I')),
    );
    r.queues(
        "duplicate presence is not count",
        "P4:D(TT)",
        set(4, |s| s.contains('T')),
    );
    r.queues(
        "P7 group predecessors",
        "P7:D(I>TS)",
        set(7, |s| before(s, b'T', b'I') && before(s, b'S', b'I')),
    );
    r.queues(
        "P7 mixed chain",
        "P7:D(I>T<S)",
        set(7, |s| before(s, b'T', b'I') && before(s, b'T', b'S')),
    );
    r.queues("correlated permutation", "[SZ]!", strings(&["SZ", "ZS"]));
    r.queues(
        "independent choices",
        "[SZ][SZ]",
        strings(&["SS", "SZ", "ZS", "ZZ"]),
    );
    r.queues("legacy duplicate kinds", "[TTI]!", strings(&["TI", "IT"]));
    r.queues("fixed local scope", "T{IOSZ}:D(I<T)", strings(&["TIOSZ"]));
    r.queues("global scope differs", "{TIOSZ}:D(I<T)", BTreeSet::new());
    r.queues("rightmost attachment", "I[TS]!:D(T<S)", strings(&["ITS"]));
    r.queues(
        "union unsat branch survives",
        "{P3:D(I>T>I);IOT}",
        strings(&["IOT"]),
    );
    r.queues(
        "sibling scopes not merged",
        "{IT}:D(I<T){TI}:D(T<I)",
        strings(&["ITTI"]),
    );
    r.queues(
        "first occurrence not all occurrences",
        "{ITIT}:D(I<T)",
        strings(&["ITIT"]),
    );
    r.queues("no earlier kind", "{IOS}:D(I>T)", BTreeSet::new());
    r.queues("missing later kind", "{TSO}:D(I>T)", strings(&["TSO"]));
    r.queues("both absent", "{OSZ}:D(I>T)", BTreeSet::new());
    for text in ["P7:D(I>T>O>I)", "P7:D(I>T,O>I,T>O)", "P7:D(I<IT)"] {
        r.test(text, json!({"op":"compile","text":text}), |v| {
            v["status"] == "OK" && v["draw_feasibility"] == "UNSAT"
        });
    }
    r.test(
        "D/U opposite not statically conflated",
        json!({"op":"compile","text":"P7:D(I<T)U(T<I)"}),
        |v| v["execution_feasibility"] == "NOT_CHECKED",
    );
    r.test(
        "U cycle leaves supply intact",
        json!({"op":"compile","text":"P7:U(I>T>O>I)"}),
        |v| v["draw_feasibility"] == "NOT_CHECKED" && v["execution_feasibility"] == "UNSAT",
    );
    for text in [
        "P4:D(HAS(T))",
        "P4:D?(I>T)",
        "P4::D(T)",
        "P4:D(T)D(I)",
        "P4:D(I>T,)",
        "P4:D(I<)",
        "{P4",
        "[]",
        "P8",
        "P0",
        "P4:d(T)",
        "I;IT",
    ] {
        r.test(text, json!({"op":"compile","text":text}), |v| {
            v["status"] == "INVALID_SYNTAX" && v["complete"] == false
        });
    }
    r.test(
        "explicit old profile rejected",
        json!({"op":"compile","profile":"tessembly.rfc1.first-arrival.v1","text":"P4:D(I>T)"}),
        |v| v["status"] == "UNSUPPORTED",
    );
    r.test(
        "unknown option not dropped",
        json!({"op":"compile","text":"P4","unknown":true}),
        |v| v["status"] == "INVALID_REQUEST",
    );
    r.test(
        "budget exhaustion not empty success",
        json!({"op":"enumerate_D","text":"P7","budget":1}),
        |v| v["status"] == "INCOMPLETE" && v["complete"] == false && v.get("count").is_none(),
    );
    r.test(
        "U not silently dropped",
        json!({"op":"enumerate_D","text":"P4:U(T)"}),
        |v| v["status"] == "UNSUPPORTED",
    );
    r.test("closed usage projection",json!({"op":"evaluate_U_witness","text":"{IT}:U(T<I)","queue":"IT","order":[1,0],"closed":true}),|v|v["matches"]==true&&v["legality_checked"]==false);
    r.test("usage failure",json!({"op":"evaluate_U_witness","text":"{IT}:U(T<I)","queue":"IT","order":[0,1],"closed":true}),|v|v["matches"]==false);
    r.test("unfinished usage not false",json!({"op":"evaluate_U_witness","text":"{IT}:U(T)","queue":"IT","order":[0],"closed":false}),|v|v["status"]=="NOT_CHECKED"&&v["matches"].is_null());
    r.test("duplicate source index",json!({"op":"evaluate_U_witness","text":"IT:U(T)","queue":"IT","order":[1,1],"closed":true}),|v|v["status"]=="INVALID_REQUEST");
    r.test("scope use source not output prefix",json!({"op":"evaluate_U_witness","text":"I{TO}:U(T<O)","queue":"ITO","order":[1,0,2],"closed":true}),|v|v["matches"]==true);
    r.test("union preserves different usage witnesses",json!({"op":"evaluate_U_witness","text":"{IT:U(T);{IT}:U(T<I)}","queue":"IT","order":[0],"closed":true}),|v|v["matches"]==false);
    let occupied = hold_state(json!({"piece":"T","origin":11}));
    r.test(
        "occupied hold swap",
        json!({"op":"hold_step","state":occupied,"action":"hold"}),
        |v| {
            v["state"]["active"]["piece"] == "T"
                && v["state"]["held"]["origin"] == 10
                && v["state"]["cursor"] == 0
                && v["state"]["used_this_turn"] == true
        },
    );
    let empty = hold_state(json!("EMPTY"));
    r.test(
        "empty hold consumes one",
        json!({"op":"hold_step","state":empty,"action":"hold"}),
        |v| {
            v["state"]["active"]["piece"] == "O"
                && v["state"]["cursor"] == 1
                && v["state"]["held"]["piece"] == "I"
        },
    );
    let absent = hold_state(json!("NONE"));
    r.test(
        "none is not empty",
        json!({"op":"hold_step","state":absent,"action":"hold"}),
        |v| {
            v["status"] == "REJECTED_ACTION"
                && v["reason"] == "HOLD_UNAVAILABLE"
                && v["state"] == absent
        },
    );
    let mut locked = occupied.clone();
    locked["used_this_turn"] = json!(true);
    r.test(
        "locked unchanged",
        json!({"op":"hold_step","state":locked,"action":"hold"}),
        |v| v["reason"] == "HOLD_USED_THIS_TURN" && v["state"] == locked,
    );
    r.test(
        "lock does not forbid host-confirmed placement",
        json!({"op":"hold_step","state":locked,"action":"advance_after_lock"}),
        |v| v["status"] == "OK" && v["state"]["used_this_turn"] == false,
    );
    r.test("advanced active restriction",json!({"op":"hold_step","state":occupied,"action":"hold","policy":{"allowed":true,"rules":[{"when_active":"I","allowed":false}]}}),|v|v["reason"]=="HOLD_POLICY_DENIED"&&v["state"]==occupied);
    r.test("held kind not active restriction",json!({"op":"hold_step","state":occupied,"action":"hold","policy":{"allowed":true,"rules":[{"when_active":"T","allowed":false}]}}),|v|v["status"]=="OK");
    let mut pending = empty.clone();
    pending["queue"] = json!([]);
    pending["tail"] = json!("PENDING");
    r.test(
        "missing reveal not supply end",
        json!({"op":"hold_step","state":pending,"action":"hold"}),
        |v| v["status"] == "NOT_CHECKED" && v["state"] == pending,
    );
    let mut ended = pending.clone();
    ended["tail"] = json!("END");
    r.test(
        "ended supply unchanged",
        json!({"op":"hold_step","state":ended,"action":"hold"}),
        |v| v["reason"] == "SUPPLY_ENDED" && v["state"] == ended,
    );
    r.test(
        "empty adapter unsupported",
        json!({"op":"check_adapter","held":"EMPTY","supported":["OCCUPIED"]}),
        |v| v["status"] == "UNSUPPORTED_STATE",
    );
    r.test(
        "config conflict",
        json!({"op":"resolve_config","document":[["see","5"]],"host":[["see","7"]]}),
        |v| v["status"] == "CONFIG_CONFLICT",
    );
    r.test(
        "duplicate same config rejected",
        json!({"op":"resolve_config","document":[["see","5"],["see","5"]],"host":null}),
        |v| v["status"] == "INVALID_DOCUMENT",
    );
    r.test(
        "config no implicit defaults",
        json!({"op":"resolve_config","document":null,"host":null}),
        |v| v["complete"] == false,
    );
    if let Some(v) = r.test(
        "codec encode",
        json!({"op":"encode","text":"{P4:D(I>TS,T)}:U(T<I)"}),
        |v| v["status"] == "OK" && v["hex"].is_string(),
    ) {
        if let Some(hex) = v["hex"].as_str() {
            r.test(
                "codec exact structural roundtrip",
                json!({"op":"decode","hex":hex}),
                |v| v["status"] == "OK" && v["reencoded_hex"] == hex,
            );
            r.test(
                "codec truncation rejected",
                json!({"op":"decode","hex":&hex[..hex.len().saturating_sub(2)]}),
                |v| v["complete"] == false,
            );
            r.test(
                "codec wrong version rejected",
                json!({"op":"decode","hex":format!("000000000000{}",&hex[12..])}),
                |v| v["status"] == "UNSUPPORTED",
            );
        }
    }
    // Independent bounded exhaustive oracle over repeated kinds, not just permutations.
    let mut words = vec![String::new()];
    for _ in 0..4 {
        words = words
            .into_iter()
            .flat_map(|s| ['I', 'T', 'S'].map(move |c| format!("{s}{c}")))
            .collect();
    }
    let pattern = format!("{{{}}}:D(I>T<S)", words.join(";"));
    let expected = words
        .into_iter()
        .filter(|s| before(s, b'T', b'I') && before(s, b'T', b'S'))
        .collect();
    r.queues("81 repeated-kind cases", &pattern, expected);
}
fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let mut report = None;
    let mut split = 0;
    if args.first().is_some_and(|s| s == "--report") {
        report = args.get(1).cloned();
        split = 2;
    }
    if args.get(split).is_some_and(|s| s == "--") {
        split += 1;
    }
    if args.len() <= split {
        eprintln!("tessembly-tck [--report report.json] -- HOST [ARGS...]");
        std::process::exit(2);
    }
    let mut r = Runner {
        command: args[split..].to_vec(),
        results: Vec::new(),
        aborted: false,
    };
    run(&mut r);
    let passed = r.results.iter().filter(|v| v["passed"] == true).count();
    let output = json!({"profile":PROFILE,"protocol":PROTOCOL,"passed":passed,"total":r.results.len(),
        "scope":"black-box RFC3 reference contracts; not Clearra or GUI certification","results":r.results,"complete":!r.aborted});
    if let Some(path) = report {
        if let Err(e) = std::fs::write(
            path,
            serde_json::to_vec_pretty(&output).expect("JSON report"),
        ) {
            eprintln!("report write failed: {e}");
            std::process::exit(2);
        }
    }
    println!("{output}");
    if passed != output["total"].as_u64().unwrap_or(0) as usize {
        std::process::exit(1);
    }
}

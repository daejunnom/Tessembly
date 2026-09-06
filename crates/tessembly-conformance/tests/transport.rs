use std::{
    process::Command,
    time::{Duration, Instant},
};
use tessembly_conformance::exchange;
fn node(script: &str) -> Vec<String> {
    vec!["node".into(), "-e".into(), script.into()]
}
#[test]
fn transport_deadline_covers_backpressure_and_inherited_stdout() {
    // Node is a DEVELOPMENT test prerequisite only, not a library/runtime dependency.
    assert!(
        Command::new("node").arg("--version").output().is_ok(),
        "Node required for transport regression tests"
    );
    let start = Instant::now();
    let r = exchange(
        &node("setTimeout(()=>{},10000)"),
        vec![b'x'; 1_000_000],
        Duration::from_millis(500),
    );
    assert!(r.unwrap_err().contains("HOST_TIMEOUT"));
    assert!(start.elapsed() < Duration::from_secs(5));
    let script="require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},2000)'],{stdio:['ignore',process.stdout,'ignore']}).unref();process.stdin.resume();";
    let start = Instant::now();
    let r = exchange(&node(script), vec![], Duration::from_millis(500));
    assert!(r.unwrap_err().contains("HOST_TIMEOUT"));
    assert!(start.elapsed() < Duration::from_secs(5));
}
#[test]
fn output_limit_and_success_do_not_need_a_shell() {
    let r = exchange(
        &node("process.stdin.resume();process.stdout.write(Buffer.alloc(9000000))"),
        vec![],
        Duration::from_secs(5),
    );
    assert!(r.unwrap_err().contains("RESPONSE_LIMIT"));
    let r = exchange(
        &node("process.stdin.pipe(process.stdout)"),
        b"bounded\n".to_vec(),
        Duration::from_secs(5),
    )
    .unwrap();
    assert_eq!(r, b"bounded\n");
}

#[test]
fn diagnostic_retention_is_independent_of_large_host_responses() {
    let value = serde_json::json!({"detail": "한".repeat(100_000)});
    let preview = tessembly_conformance::response_preview(&value);
    assert!(preview.len() < 8300);
    assert!(preview.ends_with("[truncated]"));
}

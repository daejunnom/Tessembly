use std::{io::Write,process::{Command,Stdio}};
use serde_json::{json,Value};
#[test] fn actual_binary_port_preserves_request_and_profile() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_tessembly")).arg("test-port")
        .stdin(Stdio::piped()).stdout(Stdio::piped()).spawn().unwrap();
    let request = json!({"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc2.precedence.v1","id":42,"op":"enumerate_D","text":"P4:D(I<TS)"});
    writeln!(child.stdin.take().unwrap(),"{request}").unwrap();
    let out = child.wait_with_output().unwrap(); assert!(out.status.success());
    let v: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(v["id"],42); assert_eq!(v["count"],176); assert_eq!(v["complete"],true);
}
#[test] fn help_has_version_direction_and_presence() {
    let out = Command::new(env!("CARGO_BIN_EXE_tessembly")).arg("help").output().unwrap();
    let text = String::from_utf8(out.stdout).unwrap();
    assert!(text.contains("A>B")); assert!(text.contains("최초")); assert!(text.contains("RFC2"));
    assert!(text.contains("존재")); assert!(text.contains("가방"));
}

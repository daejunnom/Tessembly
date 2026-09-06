use serde_json::{json, Value};
use std::{io::Write, process::{Command, Stdio}};
#[test]
fn actual_binary_port_preserves_request_and_profile() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_tessembly")).arg("test-port").stdin(Stdio::piped()).stdout(Stdio::piped()).spawn().unwrap();
    let request = json!({"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc2.precedence.v1","id":42,"op":"enumerate_D","text":"P4:D(I<TS)"});
    writeln!(child.stdin.take().unwrap(), "{request}").unwrap();
    let out = child.wait_with_output().unwrap(); assert!(out.status.success());
    let v: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(v["id"],42); assert_eq!(v["count"],176); assert_eq!(v["complete"],true);
}
#[test]
fn help_has_version_direction_and_presence() {
    let out = Command::new(env!("CARGO_BIN_EXE_tessembly")).args(["--lang","ko","help"]).output().unwrap();
    let text = String::from_utf8(out.stdout).unwrap();
    for word in ["A>B","최초","RFC2","존재","가방"] { assert!(text.contains(word)); }
}
#[test]
fn help_uses_primary_locale_with_english_fallback() {
    for (value, expected) in [("ko_KR.UTF-8","한국어 도움말"),("en-US","English help"),("ja-JP","English help")] {
        let out = Command::new(env!("CARGO_BIN_EXE_tessembly")).arg("help").env("TESSEMBLY_LANG",value).output().unwrap();
        assert!(out.status.success()); assert!(String::from_utf8(out.stdout).unwrap().contains(expected));
    }
}
#[test]
fn explicit_language_overrides_environment_and_errors_keep_codes() {
    let out = Command::new(env!("CARGO_BIN_EXE_tessembly")).args(["--lang","en","help"]).env("TESSEMBLY_LANG","ko").output().unwrap();
    assert!(String::from_utf8(out.stdout).unwrap().contains("English help"));
    for language in ["en","ko"] {
        let out = Command::new(env!("CARGO_BIN_EXE_tessembly")).args(["--lang",language,"invalid-command"]).output().unwrap();
        assert_eq!(out.status.code(),Some(2));
        let text = String::from_utf8(out.stderr).unwrap();
        assert!(text.contains("[INVALID_ARGUMENTS]"));
        assert_eq!(text.contains("인수"),language == "ko");
    }
}

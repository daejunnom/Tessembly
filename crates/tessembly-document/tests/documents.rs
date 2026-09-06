use tessembly_core::{Piece, PredicateKind, PROFILE};
use tessembly_document::{config, parse, wire, NamedPredicate, Value};
fn doc(body: &str) -> String {
    format!("tessembly \"{PROFILE}\";\n{body}")
}
#[test]
fn advanced_and_compact_relations_agree() {
    let d = parse(&doc("supply(\"P4\"); draw(I<TS, I); use(T>IS);")).unwrap();
    assert!(d.draw.contains(&NamedPredicate::Present("I".into())));
    assert!(d
        .draw
        .contains(&NamedPredicate::Before("T".into(), "I".into())));
    assert!(d
        .draw
        .contains(&NamedPredicate::Before("S".into(), "I".into())));
    let n = d.standard_pattern().unwrap();
    assert!(n
        .constraints
        .draw
        .unwrap()
        .iter()
        .any(|p| p.kind == PredicateKind::Before(Piece::T, Piece::I)));
}
#[test]
fn formatting_is_idempotent() {
    let d = parse(&doc("// a comment\nsupply(\"{P4}:D(T)\"); draw(I<T>S);")).unwrap();
    let text = d.to_text().unwrap();
    assert_eq!(parse(&text).unwrap().to_text().unwrap(), text);
}
#[test]
fn group_and_mixed_chain_are_equivalent() {
    let a = parse(&doc("supply(\"P4\"); draw(I<T>S);")).unwrap();
    let b = parse(&doc("supply(\"P4\"); draw(T>IS);")).unwrap();
    assert_eq!(a.draw, b.draw);
}
#[test]
fn duplicate_declarations_and_keys_fail() {
    for b in [
        "supply(\"I\"); supply(\"T\");",
        "config { hold=none(); hold=none(); } supply(\"I\");",
        "config {} config {} supply(\"I\");",
        "supply(\"I\"); draw(I); draw(T);",
        "config { see=view(next=5,next=5); } supply(\"I\");",
    ] {
        assert!(parse(&doc(b)).is_err(), "{b}");
    }
}
#[test]
fn custom_sources_are_structured_not_executed() {
    let d = parse(&doc("config { registry=[\"PENTO_P\"]; rule=from_source; } supply(take(8, bag([\"I\",\"PENTO_P\",\"PENTO_P\"],weights=[1,2,2]))); draw(before(\"PENTO_P\",\"I\"));")).unwrap();
    assert_eq!(d.source_length().unwrap(), Some(8));
    assert_eq!(
        d.standard_pattern().unwrap_err().code,
        "SOURCE_REQUIRES_HOST"
    );
    assert!(d
        .requirements()
        .unwrap()
        .contains(&"measure.weighted-tokens".into()));
    assert_eq!(wire::decode(&wire::encode(&d).unwrap()).unwrap(), d);
}
#[test]
fn source_lengths_and_correlations() {
    for (s, n) in [
        ("repeat(3,shuffle(\"SZ\"))", 6),
        ("concat(queue(\"IT\"),shuffle(\"SZ\"))", 4),
        ("either(queue(\"IT\"),queue(\"TI\"))", 2),
    ] {
        assert_eq!(
            parse(&doc(&format!("supply({s});")))
                .unwrap()
                .source_length()
                .unwrap(),
            Some(n)
        );
    }
    for s in [
        "repeat(2,bag(\"IT\"))",
        "take(3,queue(\"IT\"))",
        "either(queue(\"I\"),queue(\"IT\"))",
        "concat(bag(\"IT\"),queue(\"I\"))",
    ] {
        assert!(parse(&doc(&format!("supply({s});"))).is_err(), "{s}");
    }
}
#[test]
fn standard_bag_and_weights_are_not_silently_changed() {
    for b in [
        "config { rule=seven_bag(weights=[2]); } supply(\"P7\");",
        "supply(take(3,bag(\"IT\",weights=[0,1])));",
        "supply(take(3,bag(\"IT\",weights=[1])));",
        "config { rule=seven_bag(); start=remainder(\"TT\"); } supply(\"P7\");",
    ] {
        assert!(parse(&doc(b)).is_err(), "{b}");
    }
}
#[test]
fn unknown_settings_and_external_revisions_are_explicit() {
    assert!(parse(&doc("config { se=all(); } supply(\"I\");")).is_err());
    assert!(parse(&doc("supply(external(\"mine\"));")).is_err());
    let d = parse(&doc(
        "supply(external(\"mine\",revision=\"v1\",parameters=[[\"depth\",3]],length=10));",
    ))
    .unwrap();
    assert!(d
        .requirements()
        .unwrap()
        .contains(&"host.external-provider".into()));
}
#[test]
fn observation_is_a_contract_not_extra_information() {
    let d = parse(&doc(
        "config { see=view(next=3,hold=false,memory=current,bag=hidden); } supply(\"P7\");",
    ))
    .unwrap();
    let v = config::view(&d.config["see"]).unwrap().unwrap();
    assert_eq!(v.next, 3);
    assert!(!v.hold);
    assert_eq!(v.bag, "hidden");
    let e = parse(&doc("config { see=all(); } supply(\"P7\");")).unwrap();
    assert!(config::view(&e.config["see"]).unwrap().is_none());
}
#[test]
fn host_configuration_is_single_authority() {
    let a = parse(&doc("config { rule=seven_bag();start=boundary();see=view(next=5);hold=none(); } supply(\"P7\");")).unwrap();
    let b = parse(&doc("supply(\"P4\");")).unwrap();
    assert!(b.with_host_config(&a.config).is_ok());
    let mut host = a.config.clone();
    host.insert(
        "see".into(),
        Value::Call(tessembly_document::Call::new("all", vec![])),
    );
    assert_eq!(
        a.with_host_config(&host).unwrap_err().code,
        "CONFIG_CONFLICT"
    );
    assert!(b.with_host_config(&b.config).is_err());
}
#[test]
fn advanced_hold_restriction_reaches_the_state_api() {
    let d = parse(&doc("config { hold=slot(initial=empty,used=false,allowed=true,deny=[\"I\"]); active=token(\"I\",origin=1); queue=[token(\"O\",origin=2)];cursor=0;tail=end; } supply(\"IO\");")).unwrap();
    let p = config::hold_policy(&d.config).unwrap();
    let mut s = config::hold_state(&d.config).unwrap();
    let before = s.clone();
    assert_eq!(s.swap(&p).unwrap_err().code, "HOLD_POLICY_DENIED");
    assert_eq!(s, before);
}
#[test]
fn empty_none_and_locked_hold_remain_distinct() {
    let state = " active=token(\"I\",origin=1);queue=[token(\"O\",origin=3)];cursor=0;tail=end; ";
    let empty = parse(&doc(&format!(
        "config {{ hold=slot(initial=empty);{state}}} supply(\"IO\");"
    )))
    .unwrap();
    let mut s = config::hold_state(&empty.config).unwrap();
    s.swap(&config::hold_policy(&empty.config).unwrap())
        .unwrap();
    assert_eq!(s.active.kind, Piece::O);
    assert_eq!(s.cursor, 1);
    assert!(s.used_this_turn);
    let locked = parse(&doc(&format!(
        "config {{ hold=slot(initial=token(\"T\",origin=2),used=true);{state}}} supply(\"IO\");"
    )))
    .unwrap();
    assert_eq!(
        config::hold_state(&locked.config)
            .unwrap()
            .swap(&config::hold_policy(&locked.config).unwrap())
            .unwrap_err()
            .code,
        "HOLD_USED_THIS_TURN"
    );
    let none = parse(&doc(&format!(
        "config {{ hold=none();{state}}} supply(\"IO\");"
    )))
    .unwrap();
    assert_eq!(
        config::hold_state(&none.config)
            .unwrap()
            .swap(&config::hold_policy(&none.config).unwrap())
            .unwrap_err()
            .code,
        "HOLD_UNAVAILABLE"
    );
}
#[test]
fn references_and_decisions_are_descriptions_only() {
    let d = parse(&doc("supply(\"P7\"); reference(\"A\",format=\"ctk3\",value=\"consumer-owned\",page=0); select(\"setup\",at=[0,2],choices=[\"A\"]);")).unwrap();
    assert_eq!(d.decisions.len(), 1);
    assert_eq!(wire::decode(&wire::encode(&d).unwrap()).unwrap(), d);
    assert!(parse(&doc(
        "supply(\"I\"); select(\"setup\",at=[0],choices=[\"missing\"]);"
    ))
    .is_err());
}
#[test]
fn binary_roundtrip_all_truncations_and_critical_sections() {
    let mut d = parse(&doc(
        "config { see=view(next=5);hold=slot(initial=empty); } supply(\"P4:D(I<TS)\");",
    ))
    .unwrap();
    d.optional_extensions.push(tessembly_codec::Extension {
        id: 99,
        bytes: vec![1, 2, 3],
    });
    let bytes = wire::encode(&d).unwrap();
    assert_eq!(wire::decode(&bytes).unwrap(), d);
    assert_eq!(
        d.to_text().unwrap_err().code,
        "OPAQUE_METADATA_WOULD_BE_LOST"
    );
    for i in 0..bytes.len() {
        assert!(wire::decode(&bytes[..i]).is_err(), "{i}");
    }
    let mut bad = bytes.clone();
    bad.push(0);
    assert!(wire::decode(&bad).is_err());
    let mut critical = bytes.clone();
    let offset = critical.len() - 3 - 4 - 1;
    critical[offset] = 1;
    assert_eq!(
        wire::decode(&critical).unwrap_err().code,
        "UNSUPPORTED_CRITICAL_EXTENSION"
    );
}
#[test]
fn malicious_shape_is_bounded_without_unwinding() {
    assert!(parse(&doc(&format!("supply({});", "concat(".repeat(100)))).is_err());
    for i in 0..128 {
        let b: Vec<u8> = (0..i).map(|n| ((n * 37 + i) % 256) as u8).collect();
        assert!(std::panic::catch_unwind(|| wire::decode(&b)).is_ok());
    }
}

use tessembly_core::{NodeKind, Piece, PredicateKind, PROFILE};
use tessembly_text::{format, parse};
#[test]
fn group_chain_normalizes_to_same_edges() {
    let a = parse("P4:D(I>T<S)", PROFILE).unwrap();
    let b = parse("P4:D(T<IS)", PROFILE).unwrap();
    let kinds = |n: &tessembly_core::Node| {
        n.constraints
            .draw
            .as_ref()
            .unwrap()
            .iter()
            .map(|p| p.kind)
            .collect::<Vec<_>>()
    };
    assert_eq!(kinds(&a), kinds(&b));
    assert_eq!(
        kinds(&a),
        vec![
            PredicateKind::Before(Piece::T, Piece::I),
            PredicateKind::Before(Piece::T, Piece::S)
        ]
    );
}
#[test]
fn presence_and_comparator_are_distinct() {
    let n = parse("P4:D(TS,I>T,T)", PROFILE).unwrap();
    assert!(matches!(
        n.constraints.draw.as_ref().unwrap()[0].kind,
        PredicateKind::Present(_)
    ));
    assert_eq!(format(&n).unwrap(), "P4:D(T,S,T<I,T)");
}
#[test]
fn original_offsets_and_local_attachment() {
    let n = parse(" P7:D(I>T)P4", PROFILE).unwrap();
    let NodeKind::Concat(c) = &n.kind else {
        panic!("expected concat");
    };
    assert!(c[0].constraints.draw.is_some());
    assert!(c[1].constraints.draw.is_none());
    assert_eq!(c[0].span.start, 1);
    let p = &c[0].constraints.draw.as_ref().unwrap()[0];
    assert_eq!(p.span.start, 6);
    assert_eq!(p.span.end, 9);
}
#[test]
fn strict_version_and_new_grammar() {
    assert!(parse("P4:D(I>T)", "tessembly.rfc1.first-arrival.v1").is_err());
    for text in [
        "P4:D(HAS(T))",
        "P4:D?(T)",
        "P4:D(T)D(I)",
        "P4:D(T,)",
        "P4:D(I<)",
        "[=ITO]",
        "P8",
        "I;IT",
    ] {
        assert!(parse(text, PROFILE).is_err(), "{text}");
    }
}
#[test]
fn groups_choices_and_legacy_case() {
    for text in [
        "{T[^T]!}:D(I<O)P4",
        "IOT;ITO",
        "i,o,t",
        "[TTI]!",
        "*!",
        "{P2;[IT]!}:D(T)",
    ] {
        let n = parse(text, PROFILE).unwrap();
        let f = format(&n).unwrap();
        assert_eq!(format(&parse(&f, PROFILE).unwrap()).unwrap(), f);
    }
}
#[test]
fn bounded_and_malformed_no_panics() {
    assert!(parse(&format!("{}I{}", "{".repeat(80), "}".repeat(80)), PROFILE).is_err());
    assert!(parse(&"P999999999999999999".repeat(2), PROFILE).is_err());
    for a in ["", ":", "{", "[", "é", "\0", "D?", "P", "I>"] {
        for b in ["", "}", "]", ";", ")"] {
            let _ = parse(&format!("{a}{b}"), PROFILE);
        }
    }
}

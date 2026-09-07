use tessembly_core::{Piece, PredicateKind, LEGACY_PROFILE, PROFILE};
use tessembly_text::{format, migrate_rfc2, parse};
fn kinds(s: &str, profile: &str) -> Vec<PredicateKind> {
    parse(s, profile)
        .unwrap()
        .constraints
        .draw
        .unwrap()
        .into_iter()
        .map(|p| p.kind.clone())
        .collect()
}
#[test]
fn less_is_before_and_mixed_groups_preserve_only_adjacent_edges() {
    assert_eq!(
        kinds("P4:D(I<T)", PROFILE),
        vec![PredicateKind::Before(Piece::I, Piece::T)]
    );
    assert_eq!(
        kinds("P4:D(I>T)", PROFILE),
        vec![PredicateKind::Before(Piece::T, Piece::I)]
    );
    assert_eq!(
        kinds("P4:D(I<TS)", PROFILE),
        vec![
            PredicateKind::Before(Piece::I, Piece::T),
            PredicateKind::Before(Piece::I, Piece::S)
        ]
    );
    assert_eq!(kinds("P4:D(I<T>S)", PROFILE), kinds("P4:D(T>IS)", PROFILE));
    assert_eq!(
        kinds("P4:D(I<T>S)", PROFILE),
        vec![
            PredicateKind::Before(Piece::I, Piece::T),
            PredicateKind::Before(Piece::S, Piece::T)
        ]
    );
    assert_eq!(
        format(&parse("P4:D(I<T,T)", PROFILE).unwrap()).unwrap(),
        "P4:D(I<T,T)"
    );
}
#[test]
fn explicit_legacy_text_migration_keeps_edges_not_spelling() {
    for text in [
        "P4:D(I<TS)",
        "P4:D(I<T>S)",
        "P4:D(T>IS)",
        "{T[^T]!}:D(I>O)P4",
        "{IT}:D(I>T)U(T>I)",
    ] {
        let old = parse(text, LEGACY_PROFILE).unwrap();
        let migrated = migrate_rfc2(text).unwrap();
        assert_eq!(
            format(&old).unwrap(),
            format(&parse(&migrated, PROFILE).unwrap()).unwrap()
        );
    }
    assert_eq!(migrate_rfc2("P4:D(I<T,T)").unwrap(), "P4:D(T<I,T)");
    assert!(parse("I", "tessembly.rfc99.order.v1").is_err());
}

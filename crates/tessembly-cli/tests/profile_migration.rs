use tessembly_core::{Piece, PROFILE};
use tessembly_relations::matches;
fn unhex(text: &str) -> Vec<u8> {
    text.trim()
        .as_bytes()
        .chunks_exact(2)
        .map(|p| u8::from_str_radix(std::str::from_utf8(p).unwrap(), 16).unwrap())
        .collect()
}
#[test]
fn actual_parser_and_evaluator_match_literal_first_arrival_cases() {
    let n = tessembly_text::parse("P4:D(I<T)", PROFILE).unwrap();
    let ps = n.constraints.draw.unwrap();
    for (s, expected) in [
        ("IT", true),
        ("TI", false),
        ("IOSZ", true),
        ("TOSZ", false),
        ("OSZJ", false),
        ("ITIT", true),
        ("TIIT", false),
    ] {
        let queue = s
            .bytes()
            .map(|c| Piece::from_ascii(c).unwrap())
            .collect::<Vec<_>>();
        assert_eq!(matches(&queue, &ps), expected, "{s}");
    }
}
#[test]
fn old_pattern_binary_requires_explicit_migration_and_edges_stay_identical() {
    let old = unhex(include_str!("../../../tests/fixtures/rfc2/pattern.hex"));
    assert!(tessembly_codec::decode(&old).is_err());
    let migrated = tessembly_codec::migrate_rfc2(&old).unwrap();
    assert_eq!(&migrated[..6], b"TSMB\x01\x03");
    assert_eq!(&migrated[6..], &old[6..]);
    let doc = tessembly_codec::decode(&migrated).unwrap();
    let text =
        tessembly_text::migrate_rfc2(include_str!("../../../tests/fixtures/rfc2/pattern.txt"))
            .unwrap();
    assert_eq!(tessembly_text::format(&doc.root).unwrap(), text);
    assert!(tessembly_codec::migrate_rfc2(&migrated).is_err());
}
#[test]
fn legacy_document_and_nested_binaries_are_migrated_together() {
    let old_text = include_str!("../../../tests/fixtures/rfc2/document.txt");
    assert!(tessembly_document::parse(old_text).is_err());
    let text = tessembly_document::migrate_rfc2(old_text).unwrap();
    let new = tessembly_document::parse(&text).unwrap();
    assert!(text.starts_with(&format!("tessembly \"{PROFILE}\";")));
    let old = unhex(include_str!("../../../tests/fixtures/rfc2/document.hex"));
    assert!(tessembly_document::wire::decode(&old).is_err());
    let bytes = tessembly_document::wire::migrate_rfc2(&old).unwrap();
    assert_eq!(&bytes[..6], b"TSDC\x01\x03");
    let restored = tessembly_document::wire::decode(&bytes).unwrap();
    assert_eq!(new.to_text().unwrap(), restored.to_text().unwrap());
    let mut mixed = bytes.clone();
    mixed[5] = 2;
    assert!(tessembly_document::wire::migrate_rfc2(&mixed).is_err());
}
#[test]
fn migration_preserves_reference_strings_and_explicit_before_calls() {
    let old="tessembly \"tessembly.rfc2.precedence.v1\"; supply(\"P4:D(I<T)\"); draw(before(\"I\",\"T\")); reference(\"A\",format=\"ctk3\",value=\"I<T>S\"); select(\"setup\",at=[0,2],choices=[\"A\"]);";
    let s = tessembly_document::migrate_rfc2(old).unwrap();
    assert!(s.contains("I<T>S"));
    assert!(s.contains("before(\"I\", \"T\")"));
    assert!(s.contains("T<I"));
    assert!(tessembly_document::migrate_rfc2(&s).is_err());
}
#[test]
fn unrecognized_optional_metadata_is_not_silently_relabelled() {
    let mut doc = tessembly_codec::Document {
        root: tessembly_text::parse("I", PROFILE).unwrap(),
        optional_extensions: vec![tessembly_codec::Extension {
            id: 99,
            bytes: b"rfc2:I<T".to_vec(),
        }],
    };
    let mut bytes = tessembly_codec::encode(&doc).unwrap();
    bytes[5] = 2;
    assert_eq!(
        tessembly_codec::migrate_rfc2(&bytes).unwrap_err().code,
        "MIGRATION_REQUIRES_METADATA_HANDLER"
    );
    doc.optional_extensions.clear();
    let mut d =
        tessembly_document::parse(&format!("tessembly \"{PROFILE}\"; supply(queue(\"I\"));"))
            .unwrap();
    d.optional_extensions.push(tessembly_codec::Extension {
        id: 99,
        bytes: vec![1],
    });
    let mut b = tessembly_document::wire::encode(&d).unwrap();
    b[5] = 2;
    assert_eq!(
        tessembly_document::wire::migrate_rfc2(&b).unwrap_err().code,
        "MIGRATION_REQUIRES_METADATA_HANDLER"
    );
}
#[test]
fn planning_only_filters_and_observation_extensions_are_not_implemented() {
    for s in ["P4:D(I<T||S)", "P4:D(!T)", "P4:D(T=2)", "P4:D(1-3:T)"] {
        assert!(tessembly_text::parse(s, PROFILE).is_err());
    }
    let d = format!("tessembly \"{PROFILE}\"; supply(\"P7\"); qb(\"setup\");");
    assert!(tessembly_document::parse(&d).is_err());
}

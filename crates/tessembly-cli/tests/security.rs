//! Regression evidence for untrusted byte/text boundaries, not universal certification.
use std::collections::BTreeMap;
use tessembly_core::{Constraints, Node, NodeKind, Piece, Predicate, PredicateKind, Span, PROFILE};
use tessembly_document::{Call, Document, Value};

#[test]
fn typed_ast_rejects_oversized_spans_before_analysis() {
    let root = Node::new(
        NodeKind::Literal(Piece::T),
        Span {
            start: 0,
            end: usize::MAX,
        },
    );
    assert!(root.validate().is_err());
    assert!(tessembly_relations::analyze_checked(&root).is_err());
    let report = tessembly_relations::analyze(&root);
    assert!(report.input_error.is_some());
    assert!(!report.draw_unsat && !report.execution_unsat);
}
#[test]
fn embedded_patterns_share_a_document_predicate_budget() {
    let p = Predicate {
        kind: PredicateKind::Present(Piece::T),
        span: Span::default(),
    };
    let n = Node {
        kind: NodeKind::Literal(Piece::T),
        span: Span::default(),
        constraints: Constraints {
            draw: Some(vec![p; 2050]),
            use_order: None,
        },
    };
    assert!(n.validate().is_ok());
    let mut d = Document::empty();
    d.source = Some(Value::Call(Call {
        name: "concat".into(),
        args: vec![
            Value::Pattern(Box::new(n.clone())),
            Value::Pattern(Box::new(n)),
        ],
        named: BTreeMap::new(),
    }));
    assert_eq!(d.validate().unwrap_err().code, "PREDICATE_LIMIT");
}
#[test]
fn binary_embedding_cannot_reset_predicate_budget() {
    let n = tessembly_text::parse(&format!("T:D({})", vec!["T"; 2050].join(",")), PROFILE).unwrap();
    let b = tessembly_codec::encode(&tessembly_codec::Document {
        root: n,
        optional_extensions: vec![],
    })
    .unwrap();
    fn number(b: &mut Vec<u8>, n: usize) {
        b.extend_from_slice(&(n as u32).to_le_bytes());
    }
    fn string(b: &mut Vec<u8>, s: &str) {
        number(b, s.len());
        b.extend_from_slice(s.as_bytes());
    }
    let mut body = Vec::new();
    number(&mut body, 0);
    body.push(6);
    string(&mut body, "concat");
    number(&mut body, 2);
    for _ in 0..2 {
        body.push(7);
        number(&mut body, b.len());
        body.extend_from_slice(&b);
    }
    number(&mut body, 0);
    for _ in 0..4 {
        number(&mut body, 0);
    }
    let mut encoded = b"TSDC\x01\x02".to_vec();
    number(&mut encoded, 1);
    number(&mut encoded, 1);
    encoded.push(1);
    number(&mut encoded, body.len());
    encoded.extend(body);
    assert_eq!(
        tessembly_document::wire::decode(&encoded).unwrap_err().code,
        "PREDICATE_LIMIT"
    );
}
#[test]
fn oversized_typed_config_is_rejected_before_host_merge() {
    let d = tessembly_document::parse(&format!("tessembly \"{PROFILE}\"; supply(\"I\");")).unwrap();
    let mut host = BTreeMap::new();
    host.insert("rule".into(), Value::Text("A".repeat(70_000)));
    assert!(d.with_host_config(&host).is_err());
}
#[test]
fn bounded_mutation_corpus_does_not_panic_and_accepted_bytes_roundtrip() {
    let source = format!("tessembly \"{PROFILE}\"; supply(\"P4:D(T)\");");
    let doc = tessembly_document::parse(&source).unwrap();
    let valid = tessembly_document::wire::encode(&doc).unwrap();
    let compact = tessembly_codec::encode(&tessembly_codec::Document {
        root: tessembly_text::parse("P4:D(T)", PROFILE).unwrap(),
        optional_extensions: vec![],
    })
    .unwrap();
    for prefix in 0..valid.len() {
        assert!(tessembly_document::wire::decode(&valid[..prefix]).is_err());
    }
    let mut seed = 0x812348abu32;
    let mut next = || {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        seed
    };
    for i in 0..10_000 {
        let mut b = if i % 2 == 0 {
            valid.clone()
        } else {
            compact.clone()
        };
        let n = (next() as usize % 6) + 1;
        for _ in 0..n {
            let at = next() as usize % b.len();
            b[at] = next() as u8;
        }
        if let Ok(d) = tessembly_document::wire::decode(&b) {
            let r = tessembly_document::wire::encode(&d).unwrap();
            assert_eq!(tessembly_document::wire::decode(&r).unwrap(), d);
        }
        if let Ok(d) = tessembly_codec::decode(&b) {
            let r = tessembly_codec::encode(&d).unwrap();
            assert_eq!(tessembly_codec::decode(&r).unwrap(), d);
        }
        let text = String::from_utf8_lossy(&b);
        let _ = tessembly_text::parse(&text, PROFILE);
        let _ = tessembly_document::parse(&text);
    }
}

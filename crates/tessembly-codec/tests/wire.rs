use tessembly_codec::{decode, encode, Document, Extension};
use tessembly_core::{Node, NodeKind, Piece, Predicate, PredicateKind, Span};
fn document() -> Document {
    let mut n = Node::new(
        NodeKind::Pool { mask: 127, take: 4 },
        Span { start: 0, end: 12 },
    );
    n.constraints.draw = Some(vec![Predicate {
        kind: PredicateKind::Before(Piece::T, Piece::I),
        span: Span { start: 6, end: 9 },
    }]);
    Document {
        root: n,
        optional_extensions: vec![Extension {
            id: 42,
            bytes: vec![0, 255, 42],
        }],
    }
}
#[test]
fn structural_roundtrip_and_optional_preservation() {
    let doc = document();
    let bytes = encode(&doc).unwrap();
    assert_eq!(decode(&bytes).unwrap(), doc);
}
#[test]
fn every_truncation_and_trailing_byte_rejected() {
    let bytes = encode(&document()).unwrap();
    for i in 0..bytes.len() {
        assert!(decode(&bytes[..i]).is_err(), "{i}");
    }
    let mut trailing = bytes.clone();
    trailing.push(0);
    assert!(decode(&trailing).is_err());
}
#[test]
fn unknown_critical_extension_is_not_skipped() {
    let mut b = encode(&document()).unwrap();
    // The final TLV is id=42, optional flag=0, len=3, then its bytes.
    let at = b.len() - 5;
    assert_eq!(b[at], 0);
    b[at] = 1;
    assert_eq!(
        decode(&b).unwrap_err().code,
        "UNSUPPORTED_CRITICAL_EXTENSION"
    );
}
#[test]
fn malformed_bytes_do_not_panic() {
    let b = encode(&document()).unwrap();
    for i in 0..b.len() {
        for byte in [0u8, 7, 127, 128, 255] {
            let mut x = b.clone();
            x[i] = byte;
            let _ = decode(&x);
        }
    }
    let mut overflow = b"TSMB\x01\x02".to_vec();
    overflow.extend([255; 10]);
    assert!(decode(&overflow).is_err());
}

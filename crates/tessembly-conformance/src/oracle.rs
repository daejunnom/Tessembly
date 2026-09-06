//! Independent oracle: no Tessembly crate imports, parser, or relation implementation.
use std::collections::BTreeSet;
pub const ALPHABET: &[u8] = b"IOTSZJL";
pub fn permutations(n: usize) -> Vec<String> {
    fn append(n: usize, s: &mut Vec<u8>, out: &mut Vec<String>) {
        if s.len() == n {
            out.push(String::from_utf8(s.clone()).expect("ASCII fixture"));
            return;
        }
        for c in ALPHABET {
            if s.contains(c) {
                continue;
            }
            s.push(*c);
            append(n, s, out);
            s.pop();
        }
    }
    let mut out = Vec::new();
    append(n, &mut Vec::new(), &mut out);
    out
}
pub fn before(s: &str, earlier: u8, later: u8) -> bool {
    // Project onto the two kinds instead of sharing a first-position table.
    earlier != later && s.bytes().find(|p| *p == earlier || *p == later) == Some(earlier)
}
pub fn set(n: usize, predicate: impl Fn(&str) -> bool) -> BTreeSet<String> {
    permutations(n)
        .into_iter()
        .filter(|s| predicate(s))
        .collect()
}

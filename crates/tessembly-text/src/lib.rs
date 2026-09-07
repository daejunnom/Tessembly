//! RFC3 compact grammar. Parsing never enumerates a pattern.
#![forbid(unsafe_code)]
mod parser;
mod print;
pub use parser::parse;
pub use print::format;

/// Explicitly convert RFC2 text to RFC3 without changing any Before/Present relation.
pub fn migrate_rfc2(text: &str) -> tessembly_core::Result<String> {
    format(&parse(text, tessembly_core::LEGACY_PROFILE)?)
}

pub mod filter;

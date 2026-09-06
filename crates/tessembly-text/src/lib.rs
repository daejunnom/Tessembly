//! RFC2 compact grammar. Parsing never enumerates a pattern.
#![forbid(unsafe_code)]
mod parser;
mod print;
pub use parser::parse;
pub use print::format;

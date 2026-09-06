//! Format types and bounded state contracts. No parser, enumeration, or I/O.
#![forbid(unsafe_code)]
pub mod config;
pub mod hold;
pub mod model;
pub use model::*;

pub const PROFILE: &str = "tessembly.rfc2.precedence.v1";
pub const PROTOCOL: &str = "tessembly.test-port.v1";
pub const MAX_INPUT: usize = 65_536;
pub const MAX_DEPTH: usize = 48;
pub const MAX_NODES: usize = 4096;
pub const MAX_PREDICATES: usize = 4096;
pub const MAX_DRAWS: usize = 256;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct Span { pub start: usize, pub end: usize }
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Error { pub code: &'static str, pub span: Span }
impl Error {
    pub fn new(code: &'static str) -> Self { Self { code, span: Span::default() } }
    pub fn at(code: &'static str, start: usize, end: usize) -> Self {
        Self { code, span: Span { start, end } }
    }
}
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} at {}..{}", self.code, self.span.start, self.span.end)
    }
}
impl std::error::Error for Error {}
pub type Result<T> = std::result::Result<T, Error>;

use crate::{Error, Result, Span, MAX_DEPTH, MAX_DRAWS, MAX_NODES, MAX_PREDICATES};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Hash)]
#[repr(u8)]
pub enum Piece {
    I,
    O,
    T,
    S,
    Z,
    J,
    L,
}
impl Piece {
    pub const ALL: [Self; 7] = [
        Self::I,
        Self::O,
        Self::T,
        Self::S,
        Self::Z,
        Self::J,
        Self::L,
    ];
    pub fn from_ascii(c: u8) -> Result<Self> {
        Self::ALL
            .into_iter()
            .find(|p| p.ascii() == c.to_ascii_uppercase())
            .ok_or_else(|| Error::new("INVALID_PIECE"))
    }
    pub fn from_id(id: u8) -> Result<Self> {
        Self::ALL
            .get(usize::from(id))
            .copied()
            .ok_or_else(|| Error::new("INVALID_PIECE_ID"))
    }
    pub fn ascii(self) -> u8 {
        b"IOTSZJL"[self as usize]
    }
    pub fn bit(self) -> u8 {
        1 << self as u8
    }
}
impl std::fmt::Display for Piece {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.ascii() as char)
    }
}
pub fn pieces(text: &str) -> Result<Vec<Piece>> {
    text.bytes().map(Piece::from_ascii).collect()
}
pub fn letters(queue: &[Piece]) -> String {
    queue.iter().map(|p| p.ascii() as char).collect()
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum PredicateKind {
    Present(Piece),
    Before(Piece, Piece),
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Predicate {
    pub kind: PredicateKind,
    pub span: Span,
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Constraints {
    pub draw: Option<Vec<Predicate>>,
    pub use_order: Option<Vec<Predicate>>,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum NodeKind {
    Literal(Piece),
    Pool { mask: u8, take: u8 },
    Concat(Vec<Node>),
    Union(Vec<Node>),
    Scope(Box<Node>),
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Node {
    pub kind: NodeKind,
    pub constraints: Constraints,
    pub span: Span,
}
impl Node {
    pub fn new(kind: NodeKind, span: Span) -> Self {
        Self {
            kind,
            constraints: Constraints::default(),
            span,
        }
    }
    pub fn contains_use(&self) -> bool {
        self.constraints.use_order.is_some()
            || match &self.kind {
                NodeKind::Scope(n) => n.contains_use(),
                NodeKind::Concat(ns) | NodeKind::Union(ns) => ns.iter().any(Self::contains_use),
                _ => false,
            }
    }
    /// Validates even manually built ASTs, before recursive consumers process them.
    pub fn validate(&self) -> Result<usize> {
        fn visit(n: &Node, depth: usize, count: &mut usize, preds: &mut usize) -> Result<usize> {
            *count += 1;
            if depth > MAX_DEPTH || *count > MAX_NODES {
                return Err(Error::new("AST_LIMIT"));
            }
            if n.span.start > n.span.end {
                return Err(Error::new("INVALID_SPAN"));
            }
            for block in [&n.constraints.draw, &n.constraints.use_order]
                .into_iter()
                .flatten()
            {
                if block.is_empty() {
                    return Err(Error::new("EMPTY_CONSTRAINT"));
                }
                *preds += block.len();
                if *preds > MAX_PREDICATES {
                    return Err(Error::new("PREDICATE_LIMIT"));
                }
                if block.iter().any(|p| p.span.start > p.span.end) {
                    return Err(Error::new("INVALID_SPAN"));
                }
            }
            let len = match &n.kind {
                NodeKind::Literal(_) => 1,
                NodeKind::Pool { mask, take } => {
                    if *mask == 0
                        || mask & 128 != 0
                        || *take == 0
                        || u32::from(*take) > mask.count_ones()
                    {
                        return Err(Error::new("INVALID_POOL"));
                    }
                    usize::from(*take)
                }
                NodeKind::Scope(child) => visit(child, depth + 1, count, preds)?,
                NodeKind::Concat(children) | NodeKind::Union(children) => {
                    if children.is_empty() {
                        return Err(Error::new("EMPTY_SEQUENCE"));
                    }
                    let union = matches!(n.kind, NodeKind::Union(_));
                    let mut total = 0;
                    let mut first = None;
                    for child in children {
                        let len = visit(child, depth + 1, count, preds)?;
                        if union {
                            if first.is_some_and(|x| x != len) {
                                return Err(Error::new("MIXED_SEQUENCE_LENGTHS"));
                            }
                            first = Some(len);
                            total = len;
                        } else {
                            total += len;
                        }
                        if total > MAX_DRAWS {
                            return Err(Error::new("DRAW_LIMIT"));
                        }
                    }
                    total
                }
            };
            Ok(len)
        }
        visit(self, 0, &mut 0, &mut 0)
    }
}

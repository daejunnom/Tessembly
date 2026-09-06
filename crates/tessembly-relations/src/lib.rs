//! Pure relationship evaluation and local contradiction analysis. No queue enumeration.
#![forbid(unsafe_code)]
use tessembly_core::{Node, NodeKind, Piece, Predicate, PredicateKind, Span};

pub fn matches(queue: &[Piece], predicates: &[Predicate]) -> bool {
    let mut first = [None; 7];
    for (i, p) in queue.iter().enumerate() {
        first[*p as usize].get_or_insert(i);
    }
    predicates.iter().all(|p| match p.kind {
        PredicateKind::Present(a) => first[a as usize].is_some(),
        PredicateKind::Before(a, b) => {
            first[a as usize].is_some_and(|i| first[b as usize].is_none_or(|j| i < j))
        }
    })
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cycle {
    pub pieces: Vec<Piece>,
    pub spans: Vec<Span>,
}
pub fn cycle(predicates: &[Predicate]) -> Option<Cycle> {
    let mut edges = [[false; 7]; 7];
    for p in predicates {
        if let PredicateKind::Before(a, b) = p.kind {
            edges[a as usize][b as usize] = true;
        }
    }
    fn visit(
        v: usize,
        edges: &[[bool; 7]; 7],
        color: &mut [u8; 7],
        path: &mut Vec<usize>,
    ) -> Option<Vec<usize>> {
        color[v] = 1;
        path.push(v);
        for w in 0..7 {
            if !edges[v][w] {
                continue;
            }
            if color[w] == 1 {
                let at = path.iter().position(|x| *x == w)?;
                let mut found = path[at..].to_vec();
                found.push(w);
                return Some(found);
            }
            if color[w] == 0 {
                if let Some(c) = visit(w, edges, color, path) {
                    return Some(c);
                }
            }
        }
        path.pop();
        color[v] = 2;
        None
    }
    let mut color = [0; 7];
    for v in 0..7 {
        if color[v] != 0 {
            continue;
        }
        if let Some(found) = visit(v, &edges, &mut color, &mut Vec::new()) {
            let spans = predicates
                .iter()
                .filter(|p| match p.kind {
                    PredicateKind::Before(a, b) => {
                        found.windows(2).any(|w| w == [a as usize, b as usize])
                    }
                    _ => false,
                })
                .map(|p| p.span)
                .collect();
            return Some(Cycle {
                pieces: found.into_iter().map(|i| Piece::ALL[i]).collect(),
                spans,
            });
        }
    }
    None
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Domain {
    Draw,
    Use,
}
#[derive(Clone, Debug)]
pub struct Diagnostic {
    pub domain: Domain,
    pub scope: Span,
    pub cycle: Cycle,
}
#[derive(Clone, Debug)]
pub struct Analysis {
    /// Local proof only; false means NOT_CHECKED, never a proof of satisfiability.
    pub draw_unsat: bool,
    pub execution_unsat: bool,
    pub diagnostics: Vec<Diagnostic>,
}
pub fn analyze(root: &Node) -> Analysis {
    let mut diagnostics = Vec::new();
    fn visit(n: &Node, ds: &mut Vec<Diagnostic>) -> (bool, bool) {
        let mut d = false;
        let mut u = false;
        for (domain, block) in [
            (Domain::Draw, &n.constraints.draw),
            (Domain::Use, &n.constraints.use_order),
        ] {
            if let Some(c) = block.as_ref().and_then(|ps| cycle(ps)) {
                if domain == Domain::Draw {
                    d = true;
                } else {
                    u = true;
                }
                ds.push(Diagnostic {
                    domain,
                    scope: n.span,
                    cycle: c,
                });
            }
        }
        let (child_d, child_e) = match &n.kind {
            NodeKind::Scope(child) => visit(child, ds),
            NodeKind::Concat(ns) => {
                let children: Vec<_> = ns.iter().map(|n| visit(n, ds)).collect();
                (children.iter().any(|x| x.0), children.iter().any(|x| x.1))
            }
            NodeKind::Union(ns) => {
                let children: Vec<_> = ns.iter().map(|n| visit(n, ds)).collect();
                (children.iter().all(|x| x.0), children.iter().all(|x| x.1))
            }
            _ => (false, false),
        };
        (d || child_d, d || u || child_e)
    }
    let (draw_unsat, execution_unsat) = visit(root, &mut diagnostics);
    Analysis {
        draw_unsat,
        execution_unsat,
        diagnostics,
    }
}

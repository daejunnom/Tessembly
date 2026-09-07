//! Pure relationship evaluation and local contradiction analysis. No queue enumeration.
#![forbid(unsafe_code)]
use tessembly_core::{Error, Node, NodeKind, Piece, Predicate, PredicateKind, Result, Span};

/// Invalid public input is never treated as a successful match. Prefer the checked API.
pub fn matches(queue: &[Piece], predicates: &[Predicate]) -> bool {
    matches_checked(queue, predicates).unwrap_or(false)
}
pub fn matches_checked(queue: &[Piece], predicates: &[Predicate]) -> Result<bool> {
    use tessembly_core::budget::ModelBudget;
    if queue.len() > tessembly_core::MAX_DRAWS {
        return Err(Error::new("DRAW_LIMIT"));
    }
    let mut budget = ModelBudget::default();
    for p in predicates {
        if p.span.start > p.span.end || p.span.end > tessembly_core::MAX_INPUT {
            return Err(Error::new("INVALID_SPAN"));
        }
        match &p.kind {
            PredicateKind::Filter(f) => {
                f.validate_with(&mut budget, Some(queue.len()), true, &mut |_, _| Ok(()))?
            }
            _ => budget.predicates(1)?,
        }
    }
    Ok(predicates.iter().all(|p| match &p.kind {
        PredicateKind::Present(a) => queue.contains(a),
        PredicateKind::Before(a, b) => queue
            .iter()
            .position(|p| p == a)
            .is_some_and(|i| queue.iter().position(|p| p == b).is_none_or(|j| i < j)),
        PredicateKind::Filter(f) => evaluate(queue, f),
    }))
}
/// Supply-only predicate evaluation, also usable with host-owned custom kind IDs.
pub fn evaluate_filter_checked<K: Eq>(
    queue: &[K],
    filter: &tessembly_core::Filter<K>,
) -> Result<bool> {
    if queue.len() > tessembly_core::MAX_DRAWS {
        return Err(Error::new("DRAW_LIMIT"));
    }
    filter.validate_with(
        &mut tessembly_core::budget::ModelBudget::default(),
        Some(queue.len()),
        true,
        &mut |_, _| Ok(()),
    )?;
    Ok(evaluate(queue, filter))
}
fn evaluate<K: Eq>(q: &[K], f: &tessembly_core::Filter<K>) -> bool {
    use tessembly_core::Filter;
    let position = |s: &tessembly_core::Occurrence<K>| {
        q.iter()
            .enumerate()
            .filter(|(_, k)| *k == &s.piece)
            .nth(usize::from(s.nth) - 1)
            .map(|(i, _)| i)
    };
    match f {
        Filter::Present(a) => position(a).is_some(),
        Filter::Before(a, b) => position(a).is_some_and(|i| position(b).is_none_or(|j| i < j)),
        Filter::Count(k, op, n) => op.test(q.iter().filter(|x| *x == k).count(), *n),
        Filter::All(xs) => xs.iter().all(|x| evaluate(q, x)),
        Filter::Any(xs) => xs.iter().any(|x| evaluate(q, x)),
        Filter::Not(x) => !evaluate(q, x),
        Filter::In {
            start,
            end,
            condition,
        } => evaluate(&q[usize::from(*start) - 1..usize::from(*end)], condition),
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cycle {
    pub pieces: Vec<Piece>,
    pub spans: Vec<Span>,
}
#[derive(Clone, Copy)]
enum Term<'a> {
    Kind(&'a PredicateKind, Span),
    Formula(&'a tessembly_core::Filter<Piece>, Span),
}
type Edge = (
    tessembly_core::Occurrence<Piece>,
    tessembly_core::Occurrence<Piece>,
    Span,
);
/// Only positive conjunctions share a graph. NOT, OR and windows cannot leak edges.
pub fn cycle(predicates: &[Predicate]) -> Option<Cycle> {
    let mut budget = tessembly_core::budget::ModelBudget::default();
    for p in predicates {
        let valid = match &p.kind {
            PredicateKind::Filter(f) => {
                f.validate_with(&mut budget, None, true, &mut |_, _| Ok(()))
            }
            _ => budget.predicates(1),
        };
        if valid.is_err() {
            return None;
        }
    }
    prove(
        predicates
            .iter()
            .map(|p| Term::Kind(&p.kind, p.span))
            .collect(),
    )
}
fn prove(mut todo: Vec<Term<'_>>) -> Option<Cycle> {
    use tessembly_core::{Filter, Occurrence};
    let mut edges = Vec::new();
    while let Some(t) = todo.pop() {
        match t {
            Term::Kind(PredicateKind::Present(_), _) => {}
            Term::Kind(PredicateKind::Before(a, b), span) => {
                edges.push((Occurrence::first(*a), Occurrence::first(*b), span))
            }
            Term::Kind(PredicateKind::Filter(f), span) => todo.push(Term::Formula(f, span)),
            Term::Formula(Filter::All(xs), span) => {
                todo.extend(xs.iter().map(|f| Term::Formula(f, span)))
            }
            Term::Formula(Filter::Any(xs), span) => {
                let mut first = None;
                let mut all = true;
                for x in xs {
                    match prove(vec![Term::Formula(x, span)]) {
                        Some(c) => {
                            first.get_or_insert(c);
                        }
                        None => {
                            all = false;
                            break;
                        }
                    }
                }
                if all {
                    return first;
                }
            }
            Term::Formula(Filter::In { condition, .. }, span) => {
                if let Some(c) = prove(vec![Term::Formula(condition, span)]) {
                    return Some(c);
                }
            }
            Term::Formula(Filter::Before(a, b), span) => edges.push((a.clone(), b.clone(), span)),
            // No unsound conversion of NOT(a<b) into b<a; both can be absent.
            _ => {}
        }
    }
    graph_cycle(&edges)
}
fn graph_cycle(edges: &[Edge]) -> Option<Cycle> {
    use std::collections::BTreeMap;
    let mut ids = BTreeMap::new();
    let mut keys = Vec::new();
    for (a, b, _) in edges {
        for x in [a, b] {
            if !ids.contains_key(x) {
                ids.insert(x.clone(), keys.len());
                keys.push(x.clone());
            }
        }
    }
    let mut graph = vec![Vec::new(); keys.len()];
    for (a, b, s) in edges {
        graph[ids[a]].push((ids[b], *s));
    }
    let mut color = vec![0u8; keys.len()];
    for root in 0..keys.len() {
        if color[root] != 0 {
            continue;
        }
        color[root] = 1;
        let mut stack = vec![(root, 0usize)];
        while let Some((v, next)) = stack.last_mut() {
            if *next == graph[*v].len() {
                color[*v] = 2;
                stack.pop();
                continue;
            }
            let (w, _) = graph[*v][*next];
            *next += 1;
            if color[w] == 1 {
                let at = stack.iter().position(|(x, _)| *x == w)?;
                let mut path: Vec<_> = stack[at..].iter().map(|(v, _)| *v).collect();
                path.push(w);
                let spans = path
                    .windows(2)
                    .filter_map(|pair| {
                        graph[pair[0]]
                            .iter()
                            .find(|(v, _)| *v == pair[1])
                            .map(|(_, s)| *s)
                    })
                    .collect();
                return Some(Cycle {
                    pieces: path.iter().map(|v| keys[*v].piece).collect(),
                    spans,
                });
            }
            if color[w] == 0 {
                color[w] = 1;
                stack.push((w, 0));
            }
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
    /// An invalid typed AST is NOT_CHECKED, not an empty solution set.
    pub input_error: Option<Error>,
}
pub fn analyze(root: &Node) -> Analysis {
    match analyze_checked(root) {
        Ok(analysis) => analysis,
        Err(error) => Analysis {
            draw_unsat: false,
            execution_unsat: false,
            diagnostics: vec![],
            input_error: Some(error),
        },
    }
}
/// Checked entry point recommended for consumer-supplied typed ASTs.
pub fn analyze_checked(root: &Node) -> Result<Analysis> {
    root.validate()?;
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
    Ok(Analysis {
        draw_unsat,
        execution_unsat,
        diagnostics,
        input_error: None,
    })
}

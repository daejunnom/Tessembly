use tessembly_core::{Node, NodeKind, Piece, Predicate, PredicateKind, Result};

/// Explicit normalized comparisons, not shortest possible text. Does not erase scopes.
pub fn format(root: &Node) -> Result<String> {
    root.validate()?;
    fn predicates(ps: &[Predicate]) -> String {
        ps.iter()
            .map(|p| match p.kind {
                PredicateKind::Present(a) => a.to_string(),
                PredicateKind::Before(a, b) => format!("{a}<{b}"),
            })
            .collect::<Vec<_>>()
            .join(",")
    }
    fn write(n: &Node) -> String {
        let mut s = match &n.kind {
            NodeKind::Literal(p) => p.to_string(),
            NodeKind::Pool { mask: 127, take } => format!("P{take}"),
            NodeKind::Pool { mask, take } => {
                let kinds: String = Piece::ALL
                    .into_iter()
                    .filter(|p| mask & p.bit() != 0)
                    .map(|p| p.ascii() as char)
                    .collect();
                format!("[{kinds}]{take}")
            }
            NodeKind::Scope(child) => format!("{{{}}}", write(child)),
            NodeKind::Concat(ns) => ns.iter().map(write).collect(),
            NodeKind::Union(ns) => ns.iter().map(write).collect::<Vec<_>>().join(";"),
        };
        if n.constraints.draw.is_some() || n.constraints.use_order.is_some() {
            if matches!(n.kind, NodeKind::Concat(_) | NodeKind::Union(_)) {
                s = format!("{{{s}}}");
            }
            s.push(':');
            if let Some(ps) = &n.constraints.draw {
                s.push_str(&format!("D({})", predicates(ps)));
            }
            if let Some(ps) = &n.constraints.use_order {
                s.push_str(&format!("U({})", predicates(ps)));
            }
        }
        s
    }
    Ok(write(root))
}

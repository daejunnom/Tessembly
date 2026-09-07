//! Small, budgeted developer oracle. Not the format parser or a PC search engine.
use std::collections::BTreeSet;
use tessembly_core::{Error, Node, NodeKind, Piece, Predicate, Result};
use tessembly_relations::matches_checked;

#[derive(Clone)]
pub struct UseScope {
    pub start: usize,
    pub end: usize,
    pub predicates: Vec<Predicate>,
}
#[derive(Clone)]
pub struct Variant {
    pub queue: Vec<Piece>,
    pub uses: Vec<UseScope>,
}
pub struct Budget {
    pub steps: usize,
    pub remaining: usize,
}
impl Budget {
    fn charge(&mut self, n: usize) -> Result<()> {
        if n > self.remaining {
            return Err(Error::new("INCOMPLETE"));
        }
        self.remaining -= n;
        self.steps += n;
        Ok(())
    }
    fn tick(&mut self) -> Result<()> {
        if self.remaining == 0 {
            return Err(Error::new("INCOMPLETE"));
        }
        self.remaining -= 1;
        self.steps += 1;
        Ok(())
    }
}
const MAX_VARIANTS: usize = 20_000;
const MAX_CELLS: usize = 1_000_000;
fn push(out: &mut Vec<Variant>, v: Variant, budget: &mut Budget, cells: &mut usize) -> Result<()> {
    budget.tick()?;
    *cells = cells.saturating_add(
        v.queue.len()
            + v.uses
                .iter()
                .map(|s| s.predicates.iter().map(Predicate::units).sum::<usize>() * 8 + 3)
                .sum::<usize>(),
    );
    if out.len() >= MAX_VARIANTS || *cells > MAX_CELLS {
        return Err(Error::new("INCOMPLETE"));
    }
    out.push(v);
    Ok(())
}
pub fn variants(root: &Node, budget: &mut Budget) -> Result<Vec<Variant>> {
    root.validate()?;
    fn expand(n: &Node, b: &mut Budget) -> Result<Vec<Variant>> {
        b.tick()?;
        let mut out = Vec::new();
        let mut cells = 0;
        match &n.kind {
            NodeKind::Literal(p) => push(
                &mut out,
                Variant {
                    queue: vec![*p],
                    uses: vec![],
                },
                b,
                &mut cells,
            )?,
            NodeKind::Pool { mask, take } => {
                fn walk(
                    mask: u8,
                    left: u8,
                    q: &mut Vec<Piece>,
                    out: &mut Vec<Variant>,
                    b: &mut Budget,
                    cells: &mut usize,
                ) -> Result<()> {
                    if left == 0 {
                        return push(
                            out,
                            Variant {
                                queue: q.clone(),
                                uses: vec![],
                            },
                            b,
                            cells,
                        );
                    }
                    for p in Piece::ALL {
                        if mask & p.bit() == 0 {
                            continue;
                        }
                        b.tick()?;
                        q.push(p);
                        walk(mask ^ p.bit(), left - 1, q, out, b, cells)?;
                        q.pop();
                    }
                    Ok(())
                }
                walk(*mask, *take, &mut Vec::new(), &mut out, b, &mut cells)?;
            }
            NodeKind::Scope(child) => out = expand(child, b)?,
            NodeKind::Union(ns) => {
                for child in ns {
                    for v in expand(child, b)? {
                        push(&mut out, v, b, &mut cells)?;
                    }
                }
            }
            NodeKind::Concat(ns) => {
                out.push(Variant {
                    queue: Vec::new(),
                    uses: Vec::new(),
                });
                for child in ns {
                    let suffixes = expand(child, b)?;
                    let mut next = Vec::new();
                    let mut next_cells = 0;
                    for prefix in &out {
                        for suffix in &suffixes {
                            b.tick()?;
                            let offset = prefix.queue.len();
                            let mut v = prefix.clone();
                            v.queue.extend_from_slice(&suffix.queue);
                            v.uses.extend(suffix.uses.iter().map(|s| UseScope {
                                start: s.start + offset,
                                end: s.end + offset,
                                predicates: s.predicates.clone(),
                            }));
                            push(&mut next, v, b, &mut next_cells)?;
                        }
                    }
                    out = next;
                }
            }
        }
        if let Some(ps) = &n.constraints.draw {
            let mut accepted = Vec::new();
            let weight = ps.iter().map(Predicate::units).sum::<usize>();
            for v in out {
                b.charge(weight.saturating_mul(v.queue.len() + 1))?;
                if matches_checked(&v.queue, ps)? {
                    accepted.push(v);
                }
            }
            out = accepted;
        }
        if let Some(ps) = &n.constraints.use_order {
            let existing: usize = out
                .iter()
                .map(|v| {
                    v.queue.len()
                        + v.uses
                            .iter()
                            .map(|s| {
                                s.predicates.iter().map(Predicate::units).sum::<usize>() * 8 + 3
                            })
                            .sum::<usize>()
                })
                .sum();
            let added = out
                .len()
                .checked_mul(
                    ps.iter()
                        .map(Predicate::units)
                        .sum::<usize>()
                        .saturating_mul(8)
                        .saturating_add(3),
                )
                .ok_or_else(|| Error::new("INCOMPLETE"))?;
            if added > MAX_CELLS.saturating_sub(existing) {
                return Err(Error::new("INCOMPLETE"));
            }
            for v in &mut out {
                v.uses.push(UseScope {
                    start: 0,
                    end: v.queue.len(),
                    predicates: ps.clone(),
                });
            }
        }
        // Bound use attachments added after materialization too.
        let cost: usize = out
            .iter()
            .map(|v| {
                v.queue.len()
                    + v.uses
                        .iter()
                        .map(|s| s.predicates.iter().map(Predicate::units).sum::<usize>() * 8 + 3)
                        .sum::<usize>()
            })
            .sum();
        if cost > MAX_CELLS {
            return Err(Error::new("INCOMPLETE"));
        }
        Ok(out)
    }
    expand(root, budget)
}
pub fn draw_queues(root: &Node, budget: &mut Budget) -> Result<BTreeSet<Vec<Piece>>> {
    root.validate()?;
    if root.contains_use() {
        return Err(Error::new("UNSUPPORTED_USE_IN_DRAW_ENUMERATION"));
    }
    Ok(variants(root, budget)?
        .into_iter()
        .map(|v| v.queue)
        .collect())
}
pub fn check_use(
    root: &Node,
    queue: &[Piece],
    order: &[usize],
    closed: bool,
    budget: &mut Budget,
) -> Result<Option<bool>> {
    let mut ids = BTreeSet::new();
    for i in order {
        if *i >= queue.len() || !ids.insert(*i) {
            return Err(Error::new("INVALID_SOURCE_INDICES"));
        }
    }
    if !closed {
        return Ok(None);
    }
    let candidates = variants(root, budget)?;
    let mut member = false;
    for v in candidates {
        if v.queue != queue {
            continue;
        }
        member = true;
        let mut satisfied = true;
        for scope in &v.uses {
            let projected: Vec<_> = order
                .iter()
                .filter(|i| **i >= scope.start && **i < scope.end)
                .map(|i| queue[*i])
                .collect();
            budget.charge(
                scope
                    .predicates
                    .iter()
                    .map(Predicate::units)
                    .sum::<usize>()
                    .saturating_mul(projected.len() + 1),
            )?;
            if !matches_checked(&projected, &scope.predicates)? {
                satisfied = false;
                break;
            }
        }
        if satisfied {
            return Ok(Some(true));
        }
    }
    if member {
        Ok(Some(false))
    } else {
        Err(Error::new("QUEUE_NOT_IN_PATTERN"))
    }
}

#[cfg(test)]
mod security_tests {
    use super::*;
    #[test]
    fn use_predicates_are_budgeted_before_permutation_clones() {
        let text = format!("P7:U({})", vec!["T"; 4096].join(","));
        let root = tessembly_text::parse(&text, tessembly_core::PROFILE).unwrap();
        let mut budget = Budget {
            steps: 0,
            remaining: 1_000_000,
        };
        assert_eq!(
            variants(&root, &mut budget).err().unwrap().code,
            "INCOMPLETE"
        );
    }
}

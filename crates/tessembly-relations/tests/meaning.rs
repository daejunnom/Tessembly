use tessembly_core::{Node,NodeKind,Piece,Predicate,PredicateKind,Span};
use tessembly_relations::{matches,cycle,analyze};
fn p(k: PredicateKind) -> Predicate { Predicate { kind:k,span:Span::default() } }
#[test] fn independent_exhaustive_projection_1093() {
    fn words(depth: usize,q: &mut Vec<Piece>,count: &mut usize) {
        *count += 1;
        for a in [Piece::I,Piece::T,Piece::S] { for b in [Piece::I,Piece::T,Piece::S] {
            let expected = a != b && q.iter().find(|p| **p == a || **p == b).copied() == Some(a);
            assert_eq!(matches(q,&[p(PredicateKind::Before(a,b))]),expected);
        }}
        if depth == 6 { return; }
        for a in [Piece::I,Piece::T,Piece::S] { q.push(a); words(depth+1,q,count); q.pop(); }
    }
    let mut count = 0; words(0,&mut Vec::new(),&mut count); assert_eq!(count,1093);
}
#[test] fn overlap_self_cycle_not_removed() {
    let ps = vec![p(PredicateKind::Before(Piece::I,Piece::I)),p(PredicateKind::Before(Piece::I,Piece::T))];
    assert!(cycle(&ps).is_some());
}
#[test] fn branches_and_domains_do_not_mix() {
    let mut n = Node::new(NodeKind::Literal(Piece::I),Span::default());
    n.constraints.use_order = Some(vec![p(PredicateKind::Before(Piece::I,Piece::I))]);
    let a = analyze(&n); assert!(!a.draw_unsat); assert!(a.execution_unsat);
    let union = Node::new(NodeKind::Union(vec![n,Node::new(NodeKind::Literal(Piece::T),Span::default())]),Span::default());
    assert!(!analyze(&union).execution_unsat);
}

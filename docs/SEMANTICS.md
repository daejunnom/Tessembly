# RFC2 draft semantics and implementation scope

Semantic profile: `tessembly.rfc2.precedence.v1`.
Package version, wire version, and test protocol version are independent.

## Compact grammar

```ebnf
pattern   = sequence, { ";", sequence } ;
sequence  = item, { item } ;
item      = atom, [ ":", block, [ block ] ] ;
block     = ("D" | "U"), "(", predicate, { ",", predicate }, ")" ;
predicate = group, { ("<" | ">"), group } ;
group     = piece, { piece } ;
atom      = piece | permutation | choice | wildcard | "{", pattern, "}" ;
```

Pieces are standard I/O/T/S/Z/J/L. Body lowercase letters are accepted; local options and
condition groups are uppercase. Whitespace and body commas are separators; predicate commas
are AND. D and U may each occur once on one item. D?, HAS, repeated local blocks, ::, and
old [=...] scopes are rejected. Groups are sets: `[TTI]!` is `[TI]!`, not a multiset bag.
P3P3 has independent pool draws, unlike P6. The parser does not add a global 7-bag filter.

Limits: 64 KiB source, 4096 nodes/predicates, 256 supplied pieces, bounded nesting.
Union alternatives must have equal supplied lengths in this compact compatibility profile.
The broader internal format is not claimed to cover every Clearra parser edge case.

## Relations

`A>B` lowers to `Before(A,B)`; `A<B` lowers to `Before(B,A)`.
A group comparison produces the Cartesian product of pairs. A mixed chain produces only
adjacent comparisons. Thus `I<T>S` and `T>IS` are equivalent; `I<TS` is different.
No order is added inside IS or TS. Bare TS produces Present(T) AND Present(S).
Duplicates may remain with source spans; self-pairs must never be removed as duplicates.

`Before(a,b,w) = a exists AND (b absent OR first(a) < first(b))`.
FIRST refers only to the closed scope. It does not read previous or future scopes.
Absence is not the same as a hidden/unobserved future. Missing a means false.
The host must not treat unobserved pieces as absent in a see-n observation.

D evaluates supplied pieces. U projects the provided source-origin index order onto the
scope. Duplicate/out-of-range origins are rejected. Open use windows return NOT_CHECKED.
No hold/placement legality is inferred from a U relationship match.

## UNSAT

The relation crate finds strict cycles in each domain/scope separately. A cycle proves
that branch impossible. A union remains potentially live if any branch survives.
D and U, sibling scopes, and nested distinct scopes are never merged into one graph.
Absence of a local cycle is NOT_CHECKED, not SAT. A U-only cycle leaves the raw supply
language intact. CLI `--deny-unsat` is a build policy, not a syntax redefinition.

## State and environment

The typed environment constructor rejects repeated keys even with equal values. Conflicting
host/document environments fail; there is no last-write-wins or implicit missing environment.
Environment keys/values are opaque in this draft and are not a full CONFIG parser.

Hold slot NONE, EMPTY, OCCUPIED are distinct from used_this_turn and policy allow/deny.
Default policy allows hold, but does not force it. Advanced per-active-kind rules are checked
before hold; they do not forbid ordinary placement or automatically inspect held kind.
Rule duplicates fail. A specific override never unlocks a used turn or creates a missing slot.

Occupied swap consumes no future queue piece. Empty hold consumes one. Both lock further
hold until a host-confirmed lock/new spawn. Errors leave the state unchanged. Pending supply
and ended supply are distinct. Token origins survive swaps even when kinds match.
`advance_after_lock` only accounts for a host-confirmed placement and following spawn; a
terminal lock is owned by the host and must not fabricate a next piece.

External occupied-only models reject EMPTY as UNSUPPORTED_STATE. Any equivalent physical-to-
engine mapping must be implemented and independently tested by the adapter; none is fabricated.

## Migration and provenance

The supplied RFC1 archive SHA-256 was checked before rewriting:
`aead36860d9b1808bcbf3e049a7c9d1affe91ff87aee3865250bfe15ba6acc7b`.
Its Python source was read as reference, not used at runtime or copied as an engine.
The RFC2 Work handoff defines the reversed comparison meaning. This draft rejects RFC1 input
rather than reinterpreting it. A complete RFC1 migration tool remains follow-up work.

# Review plan: logical filters and QB/OQB declarations

**Status: DESIGN ONLY — AWAITING OWNER GO/NO-GO. This document is not implementation approval.**

Baseline: the 0.2.0 candidate with RFC3 order alignment and explicit RFC2 migration. This change does not implement OR/NOT, counts, subwindows, occurrence selectors or richer observation branches. Existing reference/select/before/present/AND declarations are already available; they are not the richer features proposed here.

## 1. Purpose and fixed boundaries

The new compact syntax exists for similarity to Clearra queue inputs and internal structure. It is not justified by claiming sfinder or Marfung notation is absent or useless. Explicit syntax nodes should map naturally to scopes, supplies and relations. KPCA is the intended reference name; KPCO was a typo.

Expand representational meaning, not execution ownership. Excluded: natural-language/LM processing or training, PC search, search/result ranking, policy synthesis, external dataset download/query/cache, Clearra/CTK3/sfinder/Fumen/HF adapter implementation, randomizer execution and replay. References never auto-execute. Preserve MIT, zero npm runtime dependencies and the separation of format crates from optional developer tools.

## 2. Approval units

| Unit | Proposal | Recommendation | Current state |
|---|---|---|---|
| F1 | Boolean AST, AND/OR/NOT and per-kind counts | Candidate for GO | Unapproved; unimplemented |
| F2 | Subwindows and occurrence selectors | Separate GO after F1 | Unapproved; unimplemented |
| Q1 | Observation, decisions, goals and common-prefix references | Candidate for GO | Unapproved; unimplemented |
| M1 | External data revision/state/graph/metric contract | Optional part of Q1 | Unapproved; unimplemented |
| R1 | Arbitrary regex and external expression execution | Recommend NO-GO | Excluded |

F1 and Q1 can be approved independently. Publishing this plan on Pages does not authorize work. GO applies only to selected units; their exact field names, grammar and contract examples must be frozen before implementation.

## 3. F1: logical filters

### Model and capabilities

Proposed nodes are All, Any, Not, Before, Present and Count; these names are design sketches, not newly added symbols. Commas and piece groups retain AND semantics. First occurrence and absence semantics remain unchanged. Internal Before(A,B) always means A first, independently of a text profile.

Use versioned semantic extension tags. A consumer may implement only Before/Present; unknown required meaning returns UNSUPPORTED, never silently drops a filter. Validation is not a general satisfiability solver.

### Proposed user syntax — NOT accepted by the current parser

```text
P7:D(I<T | S<Z)
P7:D(!(I<T))
P4:D(T=1)
P4:D(T=0)
P7:D((I<T | S<Z), T)
```

Recommended: comma = AND, `|` = OR, `!` = NOT, parentheses=grouping (the standalone ! is NOT; the combined token != in a count is inequality). Keep source ! as full permutation, source [] as a pool, and ; as supply alternatives. Do not add &&/|| aliases at the same time or reinterpret [] as filter OR. Precedence: selector/count/order atom, then NOT, then comma AND, then OR. A formatter must parenthesize mixed expressions. `I<T | S<Z,T` means `I<T | (S<Z AND T present)`, unlike `(I<T | S<Z),T`.

Counts use ordinary integer comparison of occurrences in the selected scope, not positions. Initial F1 should expose one kind per count atom: `T=1,S=1`. If TS=1 is added later, it must mean a per-kind conjunction, not a sum or OR. Proposed operators are =, !=, <, <=, >, >= with nonnegative bounded integers. Numeric > is ordinary quantity comparison, not an order convention.

### Logic and resource rules

`!(I<T)` is not `T<I`: both kinds absent makes the first true and the second false. Hidden future pieces are not absent. Boolean evaluation on a complete supply is distinct from determining a predicate from partial knowledge.

A cycle proves an AND branch impossible only within the same scope, order domain and occurrence references. An impossible OR branch does not kill surviving branches. Do not insert negated edges into a positive order graph. No proof yields NOT_CHECKED; resource exhaustion yields INCOMPLETE, never empty success or fabricated UNSAT.

Preserve the Boolean tree rather than expanding all DNF/CNF branches. Apply shared depth/node/predicate budgets. Optional relation tooling may evaluate one concrete supply/use witness; hosts own enumeration and policy search.

## 4. F2: windows and occurrence selectors

Current braces group expressions without creating a bag. Propose internal Window(start,end) as zero-based, start-inclusive, end-exclusive. A one-based UI must explicitly convert rather than reuse the same fields. Reject out-of-range windows instead of silently clipping. Unknown lengths remain host-required or unresolved. A window is not a physical bag number; bag references require confirmed source/cursor/origin facts.

Keep bare I<T as first occurrence. Propose Occurrence(kind,n,scope), with n starting at 1. Never reinterpret existing TT<I as a second-occurrence condition: current groups do not encode counts. An advanced AT(T,2) spelling can be reviewed under F2, not added under F1.

The second supplied T and the particular T stored from an earlier bag are different references. D occurrence order must not be confused with U output positions or source identities. Specific-origin conditions require the host's provenance mapping; ordinary users should not number every identical piece.

## 5. Marfung/sfinder interoperability contract

External developers own adapters. Tessembly would provide transformation rules, supported subsets, rejection examples and independent vectors. Do not bundle a Python runtime or Marfung code into the npm runtime.

| Marfung feature | Required preservation |
|---|---|
| *p7{I<T} | Can map to P7:D(I<T) |
| T[^T]!{I<O} | Preserve cumulative scope with {T[^T]!}:D(I<O) |
| Comma resets filter scope | Build scope nodes rather than deleting commas |
| [TTI]! | Preserve multiplicity; never reduce to compact [TI]! |
| [TS] inside filters | Map OR to Any; distinguish source pool syntax |
| TT<I | Requires occurrence extension or explicit unsupported result |
| 1-3: | Exact zero-based end-exclusive window |
| /regex/ | Excluded initially; never silently discard |

An adapter may enumerate under a resource budget, but incomplete enumeration is INCOMPLETE, not a complete representation of a smaller set.

## 6. Q1: QB/OQB as information and decision declarations

Existing `select("setup",at=[0,2],choices=["A"])` records basic timing/choice references. It is not a complete QB/OQB semantics implementation.

| Axis | Proposed data |
|---|---|
| Decision target | Setup variant, finishing branch or retained inventory |
| Anchor | Setup start, spawn completion, locks and reveal relationship |
| Knowledge contract | History, active/hold/preview, public rules and correlated alternatives |
| Decision times | Initial commitment or permitted later refinement |
| Common-prefix reference | External actions required before additional observation |
| Goal reference | Current PC, remaining inventory or expected future PC count |
| Choices | Versioned CTK3 or other consumer-owned references |

QB commits a declared choice using a declared start observation. OQB permits refinement after legal shared progress reveals more information. Do not hardcode OQB to one or two placements. KPCA/PC INFO KOREA has later decisions and save-oriented examples, including cases where current PC success is already 100%.

Old at=[0,2] integers cannot express spawn/reveal phases. New fields should identify anchor, lock count and pre/post-reveal phase in a new extension/version, never silently redefine old timing.

Observation conditions are not supply filters. Do not regenerate hidden queues advantageously or mistake unobserved for absent. Preserve the correlated set {SZ,ZS}; do not widen it to independent [SZ][SZ]. Record nonanticipation: equal observation histories require equal choices until new information arrives. Hosts, not Tessembly, prove that property over policies.

Later decisions cannot undo earlier placements. Physical common-prefix legality, universal coverage, optimality and 100% success are host claims, not consequences of valid syntax. Additional observation permitted, actually used, and necessary are different metadata claims.

Keep NONE/EMPTY/OCCUPIED, used_this_turn and per-active-kind hold restrictions distinct. A sorted active/hold pair is an optional host-proven projection, not the canonical physical state. Do not discard origins, locks or reveal timing. Empty-hold normalization must neither add choices nor reveal an otherwise hidden preview piece.

## 7. M1: external evidence and metric meaning

Do not adopt muse918 graph IDs or packed states as generic core IDs. Propose optional metadata for provider, dataset revision, graph identity, state-index identity, rules/view/hold assumptions, result metric, action encoding and coverage. No fetch or lookup belongs to this extension.

Expected future PC count (V*) is not current-PC success probability. Preserve units/objective descriptions without adding a scoring or optimization engine. A recorded recommendation is not the set of all legal actions.

Distinguish unsupported state, missing entry, recorded no-action, revision/index mismatch and contradictory input. A failed lookup is not UNSAT or proof of PC impossibility. A bag remainder mask must identify its cursor: remainder after the revealed tail must not be read as remainder after the active piece.

## 8. Deliverables and acceptance after GO

| Work item | Scope |
|---|---|
| Relations specification/crate | Extension AST, validation, concrete-witness evaluation, budgets |
| Text tooling | Approved syntax, unambiguous rendering, source-span diagnostics |
| Document/codec | Critical/optional extensions, revisions, unsupported handling, preserved state/references |
| External developer TCK | Independent vectors, capability-selective tests through real host paths |
| Pages/help | Equivalent English/Korean semantics, examples and absence/observation explanations |

Tests must cover NOT versus reverse order, AND/OR precedence, impossible OR branches, multiplicity/absence/occurrence, window endpoints, D/U and scope separation, correlated future knowledge, hold locks, version mismatches and valid requests after resource failure. Compare exact small sets/relations independently, not just counts. TCK remains an optional external developer tool, not a product runtime or security certification.

Preserve zero dependencies and limits on input, depth, nodes, predicates, output and execution budgets. No unbounded Boolean expansion or new regex engine. Implementation budgets are not a claim to support every mathematically expressible input.

**Owner decision record: F1 ___ / F2 ___ / Q1 ___ / M1 ___ . All remain unapproved.**

## Primary references

- https://github.com/Marfung37/ExtendedSfinderPieces
- https://github.com/knewjade/solution-finder
- https://sites.google.com/view/pcinfokorea/
- https://github.com/muse918/zxcl-pc
- https://github.com/muse918/zxcl-pc-jstris-tbp
- https://huggingface.co/datasets/muse918/tetris-4lpc-mdp-vstar-policy

These reference project contracts; this design does not claim to have reverified the latest HF data files.

# Advanced document v1

Semantic profile: `tessembly.rfc2.precedence.v1`. Document schema: `tessembly.document.v1`.
The public reference implementation is `crates/tessembly-document`. It does not execute
randomizers, observation policies, external references or dataset queries.

## Grammar

Start with `tessembly "tessembly.rfc2.precedence.v1";`. A single `config { key=value; }`
block is optional for a reusable fragment. `supply(source);` is required once. `draw(...)`
and `use(...)` are each optional once. `reference(...)` and `select(...)` have unique IDs.
Duplicate keys, named arguments and singleton declarations are errors even when equal.
`//` comments, UTF-8 quoted strings, unsigned integers, booleans, symbols, lists and
nested data calls are supported. Named arguments follow positional arguments.

`draw(I<TS,I)` normalizes to `before("T","I")`, `before("S","I")`, `present("I")`.
Named relation functions also work with registered custom piece IDs. Compact D/U and
local braces can remain inside `supply("...")`. Scope and physical bag are different.

## Source vocabulary

`queue` and `shuffle` are finite; `bag` repeats its multiset when depleted; `pool` draws
with replacement. Strings represent standard piece groups; custom IDs use lists.
`weights` in bag/pool are positive integer weights per listed token. Duplicates contribute
multiple tokens, so they do not imply uniform probability per kind. No weights means 1.
`take(n, source)` bounds a stream. `repeat(n, finite)` repeats a finite source. `concat`
permits an unbounded child only at the end; `either` requires matching lengths.
`external("id", revision="...", parameters=..., initial=..., length=n)` retains a
versioned consumer-owned reference. Parameters contain data, not executable calls.

`rule=seven_bag()` is fixed equal-weight standard 7-bag. `rule=from_source` relies on the
explicit source declaration. Alternate rule/start/see/hold profiles use external refs.

## Environment and state

Execution resolves rule/start/see/hold once through `with_host_config`. Missing keys may
be provided by the host. Conflicting explicitly present keys are never overwritten.
Comparison is structural; equivalent-looking custom policies are not assumed equal.

`see=view(active=true,next=5,hold=true,memory=history,reveal=supply,bag=known)` contains
schema-v1 defaults. `memory` is history/current, `reveal` supply/lock/host, `bag` known/hidden.
`all()` describes see-inf for the declared horizon. No observer is executed in the codec.

`hold=none()` means no slot. `slot(initial=empty)` differs from an occupied
`slot(initial=token("T",origin=9))`. `used` defaults false; `allowed` defaults true.
`deny=["T"]` denies hold when the request's current active kind is T. It does not inspect
the held kind, unlock an already used turn, or prevent placement. No D/U shorthand exists.

An explicit state additionally uses active, queue (excluding active/held), cursor and
tail=end/pending. Standard `config::hold_state/hold_policy` connects to the core supply
transition API. Pending reveal is NOT_CHECKED, not a fabricated piece or exact empty result.
Custom state execution and dataset state mapping remain consumer responsibilities.

## References and decisions

`reference("A",format="ctk3",value="opaque-consumer-owned",page=0)` declares data, not
its existence or validity. `select("setup",at=[0,2],choices=["A"])` names permitted
selection times: start=0, positive counts after that many locks and subsequent spawn.
Times are strictly increasing. Choices must resolve to declared reference IDs. Common
prefix feasibility, future-information discipline and actual choice are host-owned.

## Structural wire

TSDC document wire begins `54 53 44 43 01 02`: magic, wire v1, RFC2. Then u32 LE section
count, each section u32 ID + u8 flags (0 optional / 1 critical) + u32 LE payload length.
Section 1 is required and critical. Payload order: config mapping, source value, draw
predicates, use predicates, reference calls, decision calls.

Value tags: 0=false, 1=true, 2=u64 LE, 3=UTF-8 text, 4=symbol, 5=list, 6=call,
7=embedded TSMB AST. Strings/blobs/list counts/mapping counts use u32 LE lengths.
Calls contain name, positional values, named mapping. Predicate tag0=Present(string),
tag1=Before(string,string). Binary decoding does not reparse the original text.

Max binary 1 MiB, nesting48, nodes4096, predicates4096, finite draws256, optional sections64.
Unknown critical sections, duplicates, malformed/truncated/trailing data fail explicitly.
Unknown optional sections round-trip; `to_text` refuses OPAQUE_METADATA_WOULD_BE_LOST.
Nested AST metadata is rejected rather than silently discarded. No shortest-encoding or
universal custom-policy execution promise is made.

## External developer test port

The independent executable is `tessembly-document-tck`, protocol
`tessembly.document-test-port.v1`. The reference host is `tessembly doc-port`.
Requests contain id, protocol, profile and op. Operations:

| op | fields | contract |
|---|---|---|
| capabilities | none | external-tool operations and execution boundary |
| validate | text | schema, normalized text, length, requirements, feasibility |
| roundtrip | text | structural binary roundtrip, hex, normalized text |
| project | text | standard AST only; returned environment must be retained |
| decode | hex | structural re-encoding, opaque section count |
| hold | text, action | explicit standard state transition; no placement proof |
| resolve | text, host | missing config merge without override |

stdout is one JSON response per line; logging uses stderr. Reports bind id, protocol,
profile and completeness. Implement a port on the real application path, not an unused
reference parser. The runner uses fixed fixtures and no product parser dependencies.
Repository CI runs it against the reference host solely as regression evidence.

External data access and actual Clearra/CTK3/Fumen/Sfinder/HF adapters are implemented by
the user or other developers. They are not pending internal Tessembly features. A consumer
must negotiate capabilities and report unsupported profiles/states without dropping data.

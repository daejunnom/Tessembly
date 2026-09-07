# External-developer compact conformance port v1

This is an optional tool for **external integrators**, not a production/internal runtime.
The repository applies it to its own reference CLI in CI only for regression evidence.
The separate advanced-document port and runner are specified in [DOCUMENT.md](DOCUMENT.md).

UTF-8 JSON Lines on stdin/stdout: one response per request, diagnostics on stderr. Each
request requires id, protocol=`tessembly.test-port.v1`,
profile=`tessembly.rfc3.order.v1`, and op. Unknown fields are rejected. The applied
profile and request id are echoed. Old profiles are not guessed.

| op | Additional fields |
|---|---|
| capabilities | none |
| compile / format / encode | text |
| decode | hex |
| enumerate_D | text, optional budget (1..1,000,000) |
| evaluate_U_witness | text, queue, order (source indices), closed, optional budget |
| hold_step | state, action, optional policy |
| check_adapter | held, supported (NONE/EMPTY/OCCUPIED names) |
| resolve_config | document, host (null or arrays of [key,value] pairs) |

```json
{"id":1,"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc3.order.v1","op":"enumerate_D","text":"P4:D(I>TS)"}
```

Expected count is 176. A complete result includes the exact queue set without duplicate
strings. Iteration order is not normative. Budget exhaustion returns INCOMPLETE with
complete=false and no misleading exact count. Development enumeration is intentionally
small; large patterns are consumed structurally by external engines. U in enumerate_D
is UNSUPPORTED, never silently discarded.

Compile separates valid syntax from draw/execution feasibility UNSAT or NOT_CHECKED.
Local diagnostics retain domain and source spans. A cycle in one union branch does not
make the whole union impossible.

## Hold transport

```json
{"id":2,"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc3.order.v1","op":"hold_step","action":"hold","state":{"active":{"piece":"I","origin":10},"held":{"piece":"T","origin":11},"used_this_turn":false,"queue":[{"piece":"O","origin":12}],"cursor":0,"tail":"END"},"policy":{"allowed":true,"rules":[{"when_active":"T","allowed":false}]}}
```

Current active I is not denied by this rule. Swapping gives active T, held I, unchanged
cursor and used_this_turn=true. Slots NONE, EMPTY and a token are distinct.
advance_after_lock is host-confirmed supply bookkeeping, not a placement legality proof.
Pending supply is different from an ended queue. There is no compact hold-deny syntax.

## Actual integration

TCK imports no product parser/evaluator. It uses independent finite permutation/projection
oracles, argv execution without shell interpolation, bounded responses and timeouts. Run
only trusted commands; it is not a sandbox. Capability fields describe this compact port;
advanced declarations are available through the separate document port, not implicitly here.

Connect the port to the real ingress → request → execution → output path. A spare reference
parser beside an unrelated application proves nothing about that app. GUI E2E needs an
app-specific widget adapter. Dataset queries, state mappings, physical legality and see-n
optimization are external developer responsibilities. Finite test success is evidence for
the exercised contracts, not universal correctness or certification.

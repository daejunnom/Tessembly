# Black-box test port v1

The port is a development protocol, not the binary document wire. UTF-8 JSON Lines on stdin
and stdout; one response per request, diagnostics on stderr. Each request requires id,
protocol=`tessembly.test-port.v1`, profile=`tessembly.rfc2.precedence.v1`, and op. Unknown
fields are rejected. The applied profile and request id are echoed. Old profiles are not guessed.

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
{"id":1,"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc2.precedence.v1","op":"enumerate_D","text":"P4:D(I<TS)"}
```

Expected count is 176. A complete result includes the exact queue set without duplicate
strings. Its iteration order is not normative. Exceeding the work/materialization budget
returns INCOMPLETE with complete=false and no misleading exact count. The enumerator is
intentionally small (20,000 materialized variants / bounded cells); large patterns must be
consumed structurally by an external engine. Any U in enumerate_D is UNSUPPORTED, never dropped.

A compile response has status OK for valid syntax; draw_feasibility/execution_feasibility
separately say UNSAT or NOT_CHECKED. Local diagnostics retain spans and domain. A cycle in one
union branch does not imply the complete union is UNSAT.

## Advanced hold transport

```json
{"id":2,"protocol":"tessembly.test-port.v1","profile":"tessembly.rfc2.precedence.v1","op":"hold_step","action":"hold","state":{"active":{"piece":"I","origin":10},"held":{"piece":"T","origin":11},"used_this_turn":false,"queue":[{"piece":"O","origin":12}],"cursor":0,"tail":"END"},"policy":{"allowed":true,"rules":[{"when_active":"T","allowed":false}]}}
```

Held may be NONE, EMPTY, or a token object. Current active is I so this rule does not forbid
this swap. The new active is T, held is I, cursor is unchanged, and used_this_turn is true.
`action=advance_after_lock` performs only host-confirmed lock/spawn bookkeeping. No actual
physical placement is checked. Policy restrictions have no compact D/U shortcut.

## Integration boundary

The TCK has no dependency on the production parser, relation evaluator, or other Tessembly
crates. Expected queue sets come from small independent permutations/projection oracles.
It executes an argv vector (no shell interpolation), caps response size and runtime, and
fails on wrong envelopes, duplicate results, bad counts, wrong sets, or incomplete outcomes
advertised as complete. Only trusted host commands should be run; the runner is not a sandbox.

A host must wire this port into its real input -> request -> execution -> output path.
Connecting the demo parser alongside an unrelated application does not validate that app.
GUI E2E requires an app-specific widget adapter. Hidden-queue noninterference, dataset mapping,
full placement correctness and see-n policy optimization require separate host fixtures.

Passing these finite tests is evidence for the exercised contracts, not a proof for all inputs.

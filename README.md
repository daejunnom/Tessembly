# Tessembly

A compact, extensible format for Tetris piece queues, patterns, and constraints.

Rust draft of **`tessembly.rfc2.precedence.v1`**, based on the RFC2 Work handoff.
This repository is a format/tooling project, not a PC solver, game engine, or LM application.

## Meaning first

**RFC2 `A>B` means A appears before B; `A<B` means B appears before A.**
This intentionally differs from RFC1. Old files are never inferred or silently migrated.

```text
P4:D(T)           # T must exist
P4:D(I<TS)        # T and S precede I; no order between T and S
P4:D(I<T>S)       # same as P4:D(T>IS)
P4:D(I>T,T)       # I precedes T, and T must exist
P7:D(I>T)P4       # constrain only P7
{T[^T]!}:D(I>O)P4 # braces group scope, not a new bag
P7:D(I>T)U(T>I)   # separate supply and use-order conditions
```

The comments above are explanations, not accepted inline comment syntax.
For repeated kinds, comparisons use the **first occurrence inside the exact scope**.
An earlier kind must exist. A later kind may be absent. Neither absent means false.
Presence groups and comparison groups mean AND, not OR or adjacency.

## Build and run

The declared MSRV/CI toolchain is Rust 1.85.0. No Python build/runtime dependency.

```sh
cargo test --workspace --all-targets
cargo build --workspace
cargo run -p tessembly-cli -- lint --profile rfc2 --deny-unsat examples/local.tsm
cargo run -p tessembly-cli -- format --profile rfc2 examples/groups.tsm
cargo run -p tessembly-cli -- encode --profile rfc2 examples/groups.tsm example.tsmb
cargo run -p tessembly-cli -- decode example.tsmb decoded.tsm
cargo run -p tessembly-conformance -- --report conformance-report.json -- target/debug/tessembly test-port
```

On Windows use `target/debug/tessembly.exe` in the final command.
Text file operations require an explicit profile. Binary data contains its wire/profile version.
`decode` extracts a supply fragment; optional metadata remains in the original binary.

## Components

| Crate | Responsibility |
|---|---|
| `tessembly-core` | AST, spans, immutable environment binding, typed one-slot hold state |
| `tessembly-text` | bounded compact parser and normalized printer; no enumeration |
| `tessembly-relations` | pure Before/Present checks and local UNSAT proofs |
| `tessembly-codec` | experimental structural AST binary format, bounded reader |
| `tessembly-cli` | lint/format/encode/decode and JSON Lines development test port |
| `tessembly-conformance` | independent black-box fixtures and finite oracle, no core imports |

Only CLI and TCK depend on `serde_json`. Core/text/relations/codec use the standard library.
No unsafe code, implicit external policy downloads, or subprocess calls to Python.

## Implemented scope

Compact literals, P1..P7, choice/permutation/complement groups, wildcards, unions,
brace scopes, D/U, presence groups, mixed comparison chains, precise source offsets,
local cycle proofs, bounded development enumeration, source-index use witnesses,
one-slot hold transitions, active-kind hold overrides through typed/JSON input only,
external hold-state support checks, immutable config conflict checks, AST codec, CLI and TCK.

**Not implemented:** RFC1 migration, CONFIG/high-level text language, custom piece/policy
execution, environment/hold binary serialization, full game legality, see-n policy evaluation,
Clearra/CTK3/Sfinder/Fumen/HF adapters, GUI E2E, replay. Core config values are opaque;
binding them does not validate or execute a game policy. The codec currently encodes the
standard-piece AST and optional metadata, not an entire game-state document.

A bounded operation reports INCOMPLETE rather than a complete-looking partial/empty result.
U witness checks explicitly return `legality_checked=false`.
The test port must be connected to a consumer's actual ingress/execution/output path before
its tests say anything about that consumer. Passing the demo host does not certify Clearra.

## Documentation

- [Korean help](docs/HELP.ko.md)
- [Semantics and boundaries](docs/SEMANTICS.md)
- [Experimental wire format](docs/WIRE.md)
- [Test port and integration](docs/TEST_PORT.md)

No license has been selected, no registry package is published, and no release tag is created.

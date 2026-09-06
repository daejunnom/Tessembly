# Tessembly

A compact, extensible format for Tetris piece queues, patterns, and constraints.

**Rust reference implementation of `tessembly.rfc2.precedence.v1`**, with compact and
advanced declarations, structural binary interchange, a CLI, and external-integrator tools.
This is a format/tooling project, not a PC solver, game engine, or LM application.

## Documentation

The Korean SvelteKit documentation is in [`apps/docs`](apps/docs).
The Pages deployment target is `https://daejunnom.github.io/Tessembly/`.
Deployment is managed by **Documentation Pages**, after type checks, static build and
browser tests. The repository administrator must enable **Settings → Pages → Source:
GitHub Actions** once; a workflow token cannot necessarily create a Pages site.
A successful build is not by itself evidence that the public deployment succeeded.

- [Korean CLI help](docs/HELP.ko.md)
- [Advanced document and integration contract](docs/DOCUMENT.md)
- [Compact semantics](docs/SEMANTICS.md)
- [Compact AST wire](docs/WIRE.md)
- [External compact test port](docs/TEST_PORT.md)

## Meaning first

**RFC2 `A>B` means A appears before B; `A<B` means B appears before A.**
Old RFC1 files are never inferred or silently migrated.

```text
P4:D(T)
P4:D(I<TS)
P4:D(I<T>S)
P4:D(T>IS)
P4:D(I>T,T)
{T[^T]!}:D(I>O)P4
P7:D(I>T)U(T>I)
```

Comparisons use the first occurrence inside the exact scope. The earlier kind must
exist; the later kind may be absent. Neither present means false. Groups mean AND,
not OR or adjacency. `{}` groups a constraint scope, not a physical bag.

## Advanced documents

```text
 tessembly "tessembly.rfc2.precedence.v1";
 config {
     rule = seven_bag();
     start = boundary();
     see = view(next=5, active=true, hold=true, memory=history);
     hold = slot(initial=empty);
 }
 supply("P4");
 draw(I<TS, I);
```

Implemented declarations include `config`, `supply`, `draw`, `use`, `reference` and
`select`. Supply descriptions include `pattern`, `queue`, `shuffle`, `bag`, `pool`,
`take`, `repeat`, `concat`, `either`, and versioned `external` references. Custom IDs
are registered explicitly. Optional positive token weights describe a custom model;
standard `seven_bag()` cannot be silently reweighted.

`hold=none()`, an empty slot, an occupied token, and this-turn locking are distinct.
Advanced `deny=["T"]` gates hold while T is active. It is not a compact option and is
not a proposed Clearra UI feature. Explicit state declarations connect to the small
standard hold-supply transition API without inventing pieces or origins.

## Build and use

Rust **1.85.0** is the pinned toolchain/MSRV. No Python runtime or build dependency.
Only CLI and independent TCK binaries use `serde_json`; all five format libraries and
`tessembly-document` use the Rust standard library plus the local format crates.

```sh
cargo +1.85.0 build --locked --workspace
cargo +1.85.0 test --locked --workspace --all-targets
cargo run --locked -p tessembly-cli -- check --profile rfc2 examples/groups.tsm
cargo run --locked -p tessembly-cli -- doc-check examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-format examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-encode examples/advanced/basic.tsmd example.tsmb
cargo run --locked -p tessembly-cli -- doc-decode example.tsmb restored.tsmd
```

Compact fragments require an explicit input profile. Advanced documents carry a
profile header. `TSMB` encodes a standard pattern AST; `TSDC` encodes an advanced
document including environment, structured supply, custom IDs, conditions and
references. Unknown critical sections fail; optional opaque sections are preserved.
The document text exporter refuses to discard opaque metadata.

## Small components, explicit responsibilities

| Component | Responsibility |
|---|---|
| `tessembly-core` | AST, spans, environment binding, standard hold-supply state |
| `tessembly-text` | compact parser and normalized printer |
| `tessembly-relations` | Before/Present checks and local impossibility proofs |
| `tessembly-codec` | standard structural AST wire |
| `tessembly-document` | advanced grammar, schema, immutable config, document wire |
| `tessembly-cli` | file commands and reference test ports |
| `tessembly-conformance` | independent tools for external integrators |
| `apps/docs` | static SvelteKit documentation; no product runtime dependency |

Tessembly validates **declarations**, not every host execution. A custom randomizer,
see-n/QB/OQB policy evaluator, PC solver, rotation/reachability checker, game client,
and replay engine are intentionally **consumer-owned**, not missing internal features.

**Dataset connections and Clearra/CTK3/Sfinder/Fumen/HF adapters are implemented by
the user or external developers.** References are never fetched automatically. A
reference ID or a parsed policy does not establish compatibility with a dataset's
revision, graph indices, hold assumptions, information policy, or game rules.

## External-developer conformance tools

These are optional development tools, **not an internal production runtime**.
Connect their ports to your application's actual input/compile/execution/output path.
The repository's own unit/integration tests and CI use of the tools against the
reference CLI are regression checks, not certification of Clearra or other apps.

```sh
cargo run --locked -p tessembly-conformance -- \
  --report compact-report.json -- target/debug/tessembly test-port
cargo run --locked -p tessembly-conformance --bin tessembly-document-tck -- \
  --report document-report.json -- target/debug/tessembly doc-port
```

Replace the command after `--` with your **trusted** host executable and arguments.
On Windows use the `.exe` suffix. The compact and document ports advertise their own
scope separately. Neither tool is a sandbox or a proof over every possible input.
The TCK crate imports no product parser/evaluator to construct expected answers.

`UNSAT`, `NOT_CHECKED`, `UNSUPPORTED_STATE` and `INCOMPLETE` are distinct. U relation
checks do not claim placement legality. Pending supply is not an ended queue. Exact
zero results must not mask unsupported or incomplete work.

## Developing the documentation

```sh
cd apps/docs
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Node.js 22 and npm are documentation-development dependencies only. The site is
prerendered for `/Tessembly/`, with chapter search, code copying, mobile navigation,
and readable initial HTML. Dependencies are fixed in `package-lock.json`.

The package version remains 0.1.0; no registry publication, release tag or license
selection is implied by this work. Versioned wire/schema contracts, not a claim of
universal game compatibility, define the supported format surface.

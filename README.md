# Tessembly

A compact, extensible format for Tetris piece queues, patterns, and constraints.

**MIT-licensed Rust reference implementation of `tessembly.rfc3.order.v1`**, with compact and advanced declarations, structural binary interchange, native tools, and a **zero-dependency npm/WebAssembly library**. This is a format/tooling project, not a PC solver, game engine, replay engine or language-model application.

## Documentation / 문서

**[Automatic language](https://daejunnom.github.io/Tessembly/)** · **[English](https://daejunnom.github.io/Tessembly/en/)** · **[한국어](https://daejunnom.github.io/Tessembly/ko/)**

Every chapter and table is authored in English and Korean. Neutral URLs select Korean only for a Korean browser primary language; all other languages select English. Explicit language URLs and manual choices take priority, preserving the chapter and anchor. With JavaScript disabled, neutral pages show readable English and both language links. No translation service or runtime i18n dependency is used.

- [Platform contracts](docs/PLATFORMS.md) · [Security policy](SECURITY.md) · [Scoped security review](docs/SECURITY_REVIEW.md)
- [OIDC publication and recovery](docs/PUBLISHING.md)
- [npm API](packages/npm/README.md) · [npm 한국어](packages/npm/README.ko.md)
- [English native help](docs/HELP.en.md) · [한국어 도움말](docs/HELP.ko.md)
- [Advanced documents](docs/DOCUMENT.md) · [Compact semantics](docs/SEMANTICS.md)
- [Pattern wire](docs/WIRE.md) · [External test port](docs/TEST_PORT.md)

## Meaning first

**RFC3 `A<B` means A first; `A>B` means B first.** Old RFC1 files are never inferred or silently migrated.

```text
P4:D(T)
P4:D(I>TS)
P4:D(I>T<S)
P4:D(T<IS)
P4:D(I<T,T)
{T[^T]!}:D(I<O)P4
P7:D(I<T)U(T<I)
```

Comparisons use first occurrences in the exact scope. Earlier kinds must exist; later kinds may be absent. Neither present means false. Bare kinds mean presence; groups and commas mean AND. Braces group scopes, not physical bags. D and U are separate domains. A U relation is not a physical-placement validator.

## npm / JavaScript

**0.1.1 is already published under MIT using OIDC. 0.2.0 is the comparator-alignment candidate.** A passing build is not itself publication, and existing registry tarballs are never rewritten.

```sh
npm install tessembly
# A verified artifact may be installed before its registry release:
npm install ./tessembly-0.2.0.tgz
```

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly();
console.log(t.checkPattern('P4:D(I>TS)'));
const binary = t.encodePattern('P4:D(T)');
console.log(t.decodePattern(binary));
t.dispose();
```

Node.js 22+ is supported. Browser consumers import `tessembly/browser`; provide `wasmUrl` when the bundler requires an explicitly copied asset, or `wasm` bytes/Module to avoid a fetch. The bundled Wasm uses the same Rust implementation. No Rust/Python installation, native addon, wasm-bindgen package, install hook, CDN or dataset is required at runtime.

All npm dependency categories are empty. Wasm uses local crates and the Rust standard library, with no external registry crates or Wasm imports. Native CLI/TCK JSON transport still uses serde_json, which is not linked into npm. Svelte and test tooling are isolated development dependencies.

The npm library uses browser primary language or the Node platform locale; only `ko` selects Korean. `language`, `setLanguage`, `TESSEMBLY_LANG` and `--lang` provide overrides. The native Rust CLI uses explicit preferences and locale environment variables, falling back to English when none are supplied. Desktop hosts without those variables should supply the locale or use npm CLI Intl detection. Codes, byte spans, machine JSON, syntax and stored bytes are never translated.

## Advanced documents

```text
tessembly "tessembly.rfc3.order.v1";
config {
    rule = seven_bag();
    start = boundary();
    see = view(next=5, active=true, hold=true, memory=history);
    hold = slot(initial=empty);
}
supply("P4");
draw(I>TS, I);
```

Declarations include config, supply, draw, use, reference and select. Sources include pattern, queue, shuffle, bag, pool, take, repeat, concat, either and versioned external references. Custom IDs require registration. Positive token weights describe custom models; standard seven_bag cannot silently be reweighted. These are declarations, not script execution or network calls.

NONE, EMPTY, occupied hold and turn lock remain distinct. Advanced `deny=["T"]` gates hold while T is active; it is not a compact option or a new Clearra UI feature. No piece or origin is invented.

## Native build and file tools

Rust **1.85.0** is pinned. No Python build/runtime dependency. Node is needed only for cross-platform developer transport regression fixtures, not for native library/CLI operation.

```sh
cargo +1.85.0 build --locked --workspace
cargo +1.85.0 test --locked --workspace --all-targets
cargo run --locked -p tessembly-cli -- --lang en help
cargo run --locked -p tessembly-cli -- check --profile rfc3 examples/groups.tsm
cargo run --locked -p tessembly-cli -- doc-check examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-format examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-encode examples/advanced/basic.tsmd example.tsmb
cargo run --locked -p tessembly-cli -- doc-decode example.tsmb restored.tsmd
```

Outputs must be new files; conversion refuses overwriting an existing destination. Compact file tools require an explicit profile; advanced documents carry a header. TSMB encodes the standard AST; TSDC carries environment, sources, custom IDs, conditions and references. Unknown critical sections fail, optional opaque sections are preserved, and text export refuses silent metadata loss.

## Components and external ownership

| Component | Responsibility |
|---|---|
| tessembly-core | AST, spans, cumulative model budget, environment and standard hold-supply state |
| tessembly-text | Compact parser and normalized printer |
| tessembly-relations | Before/Present relations and local impossibility proofs |
| tessembly-codec | Standard structural AST wire |
| tessembly-document | Advanced grammar, schema and document wire |
| tessembly-cli | Native file commands and reference test ports |
| tessembly-conformance | Optional independent tools for external developers |
| bindings/wasm | Standalone std/local-only Wasm build |
| packages/npm | Zero-dependency ESM API and localized CLI |
| apps/docs | Prerendered bilingual SvelteKit documentation |

**The user or external developers implement dataset and Clearra/CTK3/Sfinder/Fumen/HF adapters.** References never auto-fetch. Randomizer execution, see-n/QB/OQB evaluation, PC search, game legality and replay belong to consumers, not a hidden internal backlog.

Conformance tools are optional developer tools, **not an internal production runtime**. Connect them through the consumer's real ingress/compile/execution/output path. Repository CI against the reference CLI is regression evidence, not certification of external apps or datasets.

```sh
cargo run --locked -p tessembly-conformance -- --report compact-report.json -- target/debug/tessembly test-port
cargo run --locked -p tessembly-conformance --bin tessembly-document-tck -- --report document-report.json -- target/debug/tessembly doc-port
```

Use `.exe` on Windows. Only execute trusted commands: the tools are not a sandbox or process-tree jail. UNSAT, NOT_CHECKED, UNSUPPORTED_STATE and INCOMPLETE remain distinct.

## Platforms and security

CI runs native GNU/Linux on Ubuntu 22.04/24.04, musl on Ubuntu, Windows x64, and macOS Intel/Apple Silicon. The same npm tarball is installed on five OS configurations with Node 22 and 24. Actual commit-specific CI is the evidence, not merely listing targets. Native artifacts carry source/target identity, MIT and checksums; signing/notarization is not included.

0.2.0 bounds input before large copies, shares document-wide budgets, quarantines unexpected Wasm traps, and caps packaged linear memory at **32 MiB per instance**. Linear memory is not process RSS or a concurrent-instance cap. Public services must apply CPU/time/concurrency/process limits; custom Wasm and paths are trusted host configuration. See SECURITY.md for remaining duties. No guarantee against all attacks or independent security certification is claimed.

A separate security workflow runs **after npm platform tests**, with mutation/transport/archive regressions and exact locked-version advisory lookup. Testing tools do not become product dependencies.

## Documentation development

```sh
cd apps/docs
npm ci --ignore-scripts
npm audit --audit-level=low
npm run test:content
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

CI fails on Svelte warnings, checks language routes/primary-language selection/no-JavaScript pages/mobile navigation/copying, and verifies exact public deployed source. Actions are pinned to commit hashes. Temporary source-migration and bootstrap writer workflows are removed after their reviewed changes are applied.

## OIDC releases

The npm Trusted Publisher remains **daejunnom / Tessembly / npm-release.yml / environment npm**, with direct **npm publish** permission. Use a NEW manual run on **main**, `mode=publish`, `expected_version=0.2.0`. The default `verify-only` does not publish or test npm authorization. No npm token Secret is loaded or used as fallback.

The 0.1.1 upload was accepted; only the old checker failed after about 38 seconds. The original file is now confirmed through read-only recovery:

```sh
node scripts/release-contract.mjs recover docs/release-receipts/0.1.1.json
```

Current confirmation distinguishes propagation, permanent mismatch and an exact existing artifact. It does not delete, overwrite or blindly republish a version. A source push does not publish 0.2.0. [Full process](docs/PUBLISHING.md).

## License / 라이선스

[MIT](LICENSE) — Copyright (c) 2026 daejunnom. Project sources and documentation are covered, and npm includes the same text. Third-party components retain their own licenses.

소스·문서·npm 패키지는 MIT입니다. 0.1.1은 이미 OIDC로 공개됐고 0.2.0는 플랫폼·보안 보강 후보입니다. 의미 프로필과 바이너리 버전은 유지하며, 레지스트리 배포·서명·공증·crates.io 공개는 별도 작업입니다.

## RFC3 comparator alignment and review gate

The 0.2.0 candidate uses `A<B` for A first. Previously published 0.1.x artifacts keep RFC2 meaning. Use [explicit migration](docs/COMPARATOR_MIGRATION.md), not unlabelled reuse of old snippets. No npm publication is triggered by this source change.

[한국어 GO/NO-GO 검토안](docs/plans/FILTERS_QB_OQB.ko.md) · [English review plan](docs/plans/FILTERS_QB_OQB.en.md). Logical-filter extensions and richer QB/OQB declarations are design only; no implementation starts before owner GO.

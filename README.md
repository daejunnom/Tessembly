# Tessembly

A compact, extensible format for Tetris piece queues, patterns, and constraints.

**MIT-licensed Rust reference implementation of `tessembly.rfc2.precedence.v1`**, with compact and advanced declarations, structural binary interchange, native tools, and a **zero-dependency npm/Wasm library**. This is a format/tooling project, not a PC solver, game engine, replay engine, or language-model application.

## Documentation / 문서

**[Automatic language](https://daejunnom.github.io/Tessembly/)** · **[English](https://daejunnom.github.io/Tessembly/en/)** · **[한국어](https://daejunnom.github.io/Tessembly/ko/)**

The static SvelteKit site in `apps/docs` includes English and Korean translations of every chapter and table. Neutral URLs select Korean only when the browser's primary language is Korean; every other primary language selects English. Explicit language URLs and manual choices take priority. Old chapter URLs and anchors remain usable. No translation service or runtime i18n library is required. With JavaScript disabled, neutral pages are readable in English with links to both languages.

- [MIT license](LICENSE)
- [OIDC publishing and owner setup / OIDC 배포 설정](docs/PUBLISHING.md)
- [npm API](packages/npm/README.md) · [npm 한국어](packages/npm/README.ko.md)
- [Native English help](docs/HELP.en.md) · [네이티브 한국어 도움말](docs/HELP.ko.md)
- [Advanced documents](docs/DOCUMENT.md) · [Compact semantics](docs/SEMANTICS.md)
- [Pattern wire](docs/WIRE.md) · [External test port](docs/TEST_PORT.md)

## Meaning first

**RFC2 `A>B` means A first; `A<B` means B first.** Old RFC1 files are never inferred or silently migrated.

```text
P4:D(T)
P4:D(I<TS)
P4:D(I<T>S)
P4:D(T>IS)
P4:D(I>T,T)
{T[^T]!}:D(I>O)P4
P7:D(I>T)U(T>I)
```

Comparisons use the first occurrence inside the exact scope. Earlier kinds must exist; later kinds may be absent. Neither present means false. Bare kinds mean presence; groups and commas mean AND. Braces group scopes, not physical bags. U checks relations, not physical placement legality.

## npm / JavaScript

The initial `tessembly@0.1.0` bootstrap publication succeeded. **`0.1.1` is the next MIT npm package version**; a successful build of that version is not a registry publication. The old registry tarball is not rewritten. The package-contract workflow produces a ready-to-install tarball with license text, SHA-256/SHA-512 and source identity.

```sh
npm install tessembly
# Use a verified artifact for a version not yet published:
npm install ./tessembly-0.1.1.tgz
```

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly();
console.log(t.checkPattern('P4:D(I<TS)'));
const bytes = t.encodePattern('P4:D(T)');
console.log(t.decodePattern(bytes));
t.dispose();
```

Node.js 22+ and browsers are supported. Browser consumers import `tessembly/browser`; provide `wasmUrl` when a bundler requires an explicitly copied asset, or `wasm` bytes/Module to avoid a fetch. The bundled Wasm uses the same Rust format implementation. No Rust/Python installation, native addon, wasm-bindgen package, install hook, CDN or external dataset is required at runtime.

Every npm dependency category is empty. The Wasm build uses only local Rust crates and the standard library, with no external registry crates or Wasm imports. Native CLI/TCK JSON transport still uses serde_json, but it is not linked into npm. Svelte and browser-test tooling are isolated documentation/development dependencies.

The npm library selects the browser primary language or Node's platform locale; only `ko` selects Korean. `language`, `setLanguage`, `TESSEMBLY_LANG` and CLI `--lang` provide explicit overrides. The native Rust CLI uses `--lang` and locale environment variables, falling back to English when none are set. Desktop hosts without such variables should supply the preference or use the npm CLI's Intl detection. Error codes, byte spans, machine JSON, syntax and binary data never change with presentation language.

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

Declarations include config, supply, draw, use, reference and select. Sources include pattern, queue, shuffle, bag, pool, take, repeat, concat, either and versioned external references. Custom IDs require registration. Positive token weights describe custom models; standard seven_bag cannot silently be reweighted.

NONE, EMPTY, occupied hold and turn lock remain distinct. Advanced `deny=["T"]` gates hold while T is active; it is not a compact option or a new Clearra UI feature. No supplied piece or token origin is invented.

## Native build and file tools

Rust **1.85.0** is the pinned toolchain. No Python build/runtime dependency.

```sh
cargo +1.85.0 build --locked --workspace
cargo +1.85.0 test --locked --workspace --all-targets
cargo run --locked -p tessembly-cli -- --lang en help
cargo run --locked -p tessembly-cli -- check --profile rfc2 examples/groups.tsm
cargo run --locked -p tessembly-cli -- doc-check examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-format examples/advanced/basic.tsmd
cargo run --locked -p tessembly-cli -- doc-encode examples/advanced/basic.tsmd example.tsmb
cargo run --locked -p tessembly-cli -- doc-decode example.tsmb restored.tsmd
```

Compact file tools require an explicit profile; advanced documents carry a header. TSMB encodes the standard AST; TSDC carries the environment, structured sources, custom IDs, conditions and references. Unknown critical sections fail, optional opaque sections are preserved, and text export refuses to discard opaque metadata.

## Components and external ownership

| Component | Responsibility |
|---|---|
| tessembly-core | AST, spans, immutable environment, standard hold-supply state |
| tessembly-text | Compact parser and normalized printer |
| tessembly-relations | Before/Present relations and local impossibility proofs |
| tessembly-codec | Standard structural AST wire |
| tessembly-document | Advanced grammar, schema and document wire |
| tessembly-cli | Native file commands and reference test ports |
| tessembly-conformance | Optional independent tools for external integrators |
| bindings/wasm | Standalone std/local-only Wasm build |
| packages/npm | Zero-dependency ESM API and localized CLI |
| apps/docs | Prerendered bilingual SvelteKit documentation |

**The user or external developers implement dataset and Clearra/CTK3/Sfinder/Fumen/HF adapters.** References never auto-fetch. Randomizer execution, see-n/QB/OQB evaluation, PC search, game legality and replay belong to consumers, not a hidden internal backlog.

Conformance tools are optional developer tools, **not an internal production runtime**. Connect them through the consumer's real ingress/compile/execution/output path. Repository CI against the reference CLI is regression evidence, not certification of an external app or dataset.

```sh
cargo run --locked -p tessembly-conformance -- --report compact-report.json -- target/debug/tessembly test-port
cargo run --locked -p tessembly-conformance --bin tessembly-document-tck -- --report document-report.json -- target/debug/tessembly doc-port
```

Use `.exe` on Windows. Execute only trusted host commands; these tools are not a sandbox. UNSAT, NOT_CHECKED, UNSUPPORTED_STATE and INCOMPLETE remain separate.

## Documentation development

```sh
cd apps/docs
npm ci
npm audit --audit-level=low
npm run test:content
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

CI treats Svelte warnings as failures and checks both language routes, primary-language selection, no-JavaScript content, mobile navigation, code copying and exact deployed source identity. The cookie security override is pinned without downgrading SvelteKit.

## OIDC releases

The package owner configures npm Trusted Publisher for **daejunnom / Tessembly / npm-release.yml / environment npm**, with direct **npm publish** permission. Run the current workflow on **main**, `expected_version=0.1.1`, and select `mode=publish`. The default `verify-only` builds and validates without publishing or testing npm authorization. There is no authentication selector, token Secret reference, or automatic token fallback. Do not rerun the old bootstrap job.

[Complete setup, verification and token retirement instructions](docs/PUBLISHING.md). Revoke the bootstrap token only after an actual OIDC publication is verified. Do not paste secrets or recovery credentials into issues, source or chat.

## License / 라이선스

[MIT](LICENSE) — Copyright (c) 2026 daejunnom. The grant covers Tessembly project sources and documentation. The npm package carries the same license text and MIT metadata. Third-party components retain their own licenses.

테섬블리 소스와 문서 및 npm 패키지는 MIT 라이선스입니다. 제3자 구성요소의 라이선스는 변경하지 않습니다. npm 배포 메타데이터와 LICENSE를 갱신할 버전은 0.1.1이며, Rust 내부 버전·의미 프로필·바이너리 버전은 이번 라이선스 변경으로 올리지 않습니다. 정식 릴리스 태그나 crates.io 배포는 이 변경에 포함되지 않습니다.

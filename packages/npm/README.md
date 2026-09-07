# Tessembly

Zero-dependency ESM library and CLI for Tetris supply formats. The bundled WebAssembly uses the same Rust parser, relation checker and structural codecs as the native tools. No Rust, Python, native addon, wasm-bindgen package, postinstall script, CDN or external dataset is required at runtime.

[한국어](README.ko.md) · [Documentation](https://daejunnom.github.io/Tessembly/en/)

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly();
console.log(t.checkPattern('P4:D(I>TS)'));
const binary = t.encodePattern('P4:D(T)');
console.log(t.decodePattern(binary));
t.dispose();
```

Browser consumers import `tessembly/browser`. The adjacent `tessembly.wasm` is a package asset, not a registry dependency. If the bundler does not copy it, provide `wasmUrl` or trusted `wasm` bytes/Module. Serve the asset from your own origin and allow WebAssembly in CSP. Calls after initialization are synchronous; public services should use Worker/process isolation and quotas.

```js
import { createTessembly } from 'tessembly/browser';
const t = await createTessembly({ wasmUrl: '/assets/tessembly.wasm' });
```

Instance methods: normalizePattern/checkPattern/encodePattern/decodePattern and equivalent *Document methods. Advanced documents preserve config, sources, custom IDs, references and decision declarations. Pattern options accept only rfc2 or PROFILE. NOT_CHECKED is not a satisfiability/PC proof; U is a relation, not placement validation. Opaque metadata is not silently discarded.

**RFC3: A<B means A first; A>B means B first.** Comparisons use first occurrences inside the scope. Earlier kinds must exist, later kinds may be absent. Bare kinds mean presence. I>T<S equals T<IS. Braces are scopes, not bags.

Korean primary desktop/browser language selects ko; other languages select en. language/setLanguage override presentation; Node supports TESSEMBLY_LANG and locale variables. Error code/start/end, machine states and stored data do not change with language.

CLI: `tessembly help`, `tessembly check input.tsm`, `tessembly --lang ko doc-check input.tsmd`, `tessembly encode input.tsm output.tsmb`. Outputs must be new files. Node.js 22+ is required. All npm dependency categories and install hooks are empty; compiled Wasm is included.

## Platforms and resource boundaries

The same tarball is tested on Ubuntu 22.04/24.04, Windows x64, macOS Intel/Apple Silicon with Node 22 and 24. Chromium tests cover English, Korean and fallback languages; this does not certify every OS/browser version.

Packaged Wasm has a **32 MiB linear-memory cap per instance**, not an RSS/process/concurrency cap. Text is limited to 65,536 UTF-8 bytes; embedded patterns share model budgets. Unexpected traps invalidate the instance; normal input errors do not. dispose releases references, not a promise of immediate GC. Caller-supplied Wasm/URLs/paths are trusted configuration, never document-directed capabilities. File conversion refuses overwriting.

[Security policy](https://github.com/daejunnom/Tessembly/blob/main/SECURITY.md) · [Platform contracts](https://github.com/daejunnom/Tessembly/blob/main/docs/PLATFORMS.md). The 0.3.0 hardening release preserves RFC3 and zero-dependency policy. No claim of safety against every attack is made.

Dataset/host adapters, PC search, randomizer execution and replay belong to external consumers. Optional conformance tests are developer tools, not product runtime.

## License

[MIT](LICENSE). Copyright (c) 2026 daejunnom. Sources/documentation are covered; third-party components retain their licenses.


## F1/F2

```text
P4:D(I<T&T)
P4:D(I<T|S<Z)
P4:D(!T)
P4:D(T=1&S=0)
P7:D(IN(1,3,T))
{P7P7}:D(I[2]<T[2])
```

IN uses inclusive one-based bounds; kind[n] selects a local occurrence. &/| are logical. F2 is D-only. All ranges are checked before short circuit. Q1/M1/MATCH are not provided. Use wrapper/Wasm from the same ABI=3 package.

# Tessembly

Zero-dependency ESM library and CLI for Tetris supply formats. The bundled WebAssembly is built from the same Rust parser, relation checker and structural codecs as the native tools. No Rust, Python, Node addon, wasm-bindgen package, postinstall script, CDN or external dataset is required at runtime.

[한국어](README.ko.md) · [Documentation](https://daejunnom.github.io/Tessembly/en/)

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly();
console.log(t.checkPattern('P4:D(I<TS)'));
const binary = t.encodePattern('P4:D(T)');
console.log(t.decodePattern(binary));
t.dispose();
```

Browser applications can import `tessembly/browser`. By default the browser loads the adjacent bundled `tessembly.wasm`; this is a package asset, not a registry dependency. When a bundler does not copy this asset automatically, provide `wasmUrl`, or pass `wasm` bytes/Module to avoid fetching altogether. Serve the asset from your own origin and allow WebAssembly in your CSP. All methods after initialization are synchronous and bounded; use a Worker for untrusted or frequent workloads.

```js
import { createTessembly } from 'tessembly/browser';
const t = await createTessembly({ wasmUrl: '/assets/tessembly.wasm' });
```

Exports: `normalizePattern`, `checkPattern`, `encodePattern`, `decodePattern`, and equivalent `*Document` methods on each instance. Advanced documents include `config`, structured sources, custom IDs, references and decision declarations. Pattern options accept only `rfc2` or the full `PROFILE`; legacy profiles are rejected. `check*` returning NOT_CHECKED is not a satisfiability or PC proof. U is a relation, not a placement validator. Opaque metadata is never silently discarded by text export.

**RFC2: A>B means A first; A<B means B first.** Comparisons use first occurrences within the scope. Earlier kinds must exist, later kinds may be absent. Bare kinds mean presence. I<T>S equals T>IS. Braces are scopes, not bags.

The primary desktop/browser language selects Korean only for `ko`; everything else defaults to English. `createTessembly({language:'ko'})` or `setLanguage('en')` overrides presentation. Node also supports TESSEMBLY_LANG and standard locale environment variables. Error `.code`, `.start`, `.end`, semantic profiles and machine statuses never change with language.

CLI: `tessembly help`, `tessembly check input.tsm`, `tessembly --lang ko doc-check input.tsmd`, `tessembly encode input.tsm output.tsmb`. Advanced commands use the document header. No solver, randomizer execution, replay engine or dataset adapter is bundled. External developers own those integrations and optional conformance tools.

The npm package has no dependency categories and no install-time scripts. Build sources and independent tests live in the GitHub repository; compiled Wasm is included in the tarball. Node.js >=22 or a browser supporting WebAssembly and TextEncoder is required.

## License

[MIT](LICENSE). Copyright (c) 2026 daejunnom. The grant covers project sources and documentation; the tarball includes the license text. Third-party components retain their own licenses.

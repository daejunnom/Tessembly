# Documentation deployment checks

The SvelteKit site is static and served at `https://daejunnom.github.io/Tessembly/`.
`Documentation Pages` runs against a specific commit, installs the committed npm lock,
checks Svelte/TypeScript, prerenders every registered chapter, and runs desktop/mobile
browser contracts. The verified artifact, not a separate rebuild, is uploaded to Pages.

The deploy job then fetches the public `build-info.json` and checks its source commit
and semantic profile against the workflow input. It also fetches the home page and all
current chapter URLs. A short bounded retry handles CDN propagation; mismatch fails
rather than reporting a different deployment as this commit's result.

Local browser tests and public HTTP checks are distinct. The browser tests cover
navigation, search, copy feedback, responsive overflow, prerendered content without
JavaScript and valid JSON request examples. Public checks verify served routes and
source identity, not arbitrary client browsers or an external application's integration.

Repository administrators enable Pages once under Settings → Pages → GitHub Actions.
Deployment does not publish Rust crates, create a release tag, select a license, or
connect external datasets. Rust CI and external-developer conformance smoke reports
are separately attached to their exact source commit.

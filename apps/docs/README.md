# Tessembly documentation

Static SvelteKit documentation. It is independent from the Rust library's runtime.
Content chapters live in `src/lib/content/`; `index.js` defines navigation and prerendered
routes. Add a chapter there to extend both navigation and browser coverage.

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Node 22. Package manifests and lockfile pin the resolved documentation dependencies.
The default base path is `/Tessembly`. No server/API, model, analytics or external font
service is required to read the site. Search and copy enhance the prerendered HTML.

The Pages workflow checks the site, tests desktop/mobile paths, uploads browser evidence
and deploys the verified build. `build-info.json` identifies the deployed source commit.
First-time Pages enablement requires the repository administrator to select
**Settings → Pages → Source: GitHub Actions**. A build artifact is not a successful live
deployment; check the deploy job separately. Once enabled, run Documentation Pages from
Actions or push a documentation change. No additional hosting service or API key is used.

External integrators own the actual Clearra/CTK3/HF and game connections. The documented
conformance executables are optional tools for those developers; repository CI against
the reference host is regression testing, not external-app certification.

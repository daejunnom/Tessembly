# npm publishing / npm 배포

## Current boundary / 현재 경계

`tessembly@0.1.0` is a zero-dependency package built from the local Rust format libraries. The `npm package contracts` workflow builds the bundled Wasm, tests Node and browser usage, installs the real tarball with lifecycle scripts disabled, and uploads `tessembly-npm-package` with checksums and source identity. A verified artifact is **not** proof of publication. `Publish npm package` separately verifies the artifact and authenticates before writing to npm.

`npm package contracts`는 Rust/Wasm 빌드, 실제 압축 파일 설치, Node·브라우저 검사를 수행합니다. 검증한 파일과 해시가 준비되어도 npm 공개 배포가 완료된 것은 아닙니다. 별도 배포 작업에서 소유자 인증과 레지스트리 반영을 확인합니다.

## Different account emails / 서로 다른 계정 이메일

GitHub and npm do not need matching login emails. npm package ownership and either a publishing credential or the approved OIDC workflow establish publishing authorization. `Linked Accounts & Recovery Option` helps recover an npm account; it does not authorize this repository to publish.

로그인 이메일을 변경하거나 계정을 합칠 필요는 없습니다. npm 패키지 소유권과 배포 인증이 중요하며 Linked Accounts 연결은 계정 복구용입니다. GitHub 연결만으로 `npm publish` 권한을 얻지는 않습니다.

## First publication / 최초 등록

The npm owner must authorize the first package creation. Pick one of these routes; do not send credentials to ChatGPT or commit them to the repository.

### Short-lived token through GitHub Secrets

1. In the intended npm account, create a granular token with the minimum package write rights that allow creation of the intended package. An uncreated unscoped package may not be selectable as an existing-package scope; do not claim an unrelated package grant covers it. When narrower first-publish permission is unavailable, prefer local interactive publication below rather than a long-lived all-packages token.
2. Noninteractive token publication requires the token's appropriate `Bypass 2FA` permission where npm requires it. Keep account 2FA enabled. Use a short expiry and remove the bootstrap token after OIDC is verified. An organization or package policy may forbid token publishing; do not weaken that policy automatically.
3. Add the token as repository Secret **NPM_TOKEN** at **Settings → Secrets and variables → Actions → New repository secret**. No quotation marks, source-file insertion or chat message is needed. A same-named environment Secret takes precedence, so do not keep an older conflicting value in environment `npm`.
4. Open **Actions → Publish npm package → Run workflow**. Select branch **main**, authentication **bootstrap-token**, expected_version **0.1.0**. If environment `npm` requires approval, the authorized reviewer must approve it.
5. The workflow builds and checks the exact current commit, checks tarball SHA-256/SHA-512, publishes the same file, then verifies the version and registry integrity. A missing token reports **NPM_AUTH_REQUIRED** before publishing. An existing version is not overwritten or automatically incremented.

npm에서 새 패키지를 만들 수 있는 최소 권한의 단기 granular token을 만들고 GitHub 저장소 Secret `NPM_TOKEN`에 등록하세요. 비대화형 배포에 필요한 경우 토큰의 `Bypass 2FA` 권한을 사용하되 계정 2FA 자체를 끄지 않습니다. 아직 없는 패키지에 기존 패키지 전용 권한을 부여했다고 생각해서는 안 됩니다. 좁은 최초 등록 권한이 없다면 아래 로컬 인증 방식을 권장합니다.

워크플로 입력은 `main / bootstrap-token / 0.1.0`입니다. 토큰 값은 대화에 전달하지 않습니다. 실행 성공 문구가 아니라 최종 레지스트리 버전·integrity 검사까지 확인하세요.

### Interactive local publication without a CI token

Download the verified `tessembly-npm-package` artifact and extract the `.tgz`, `SHA256SUMS` and `build-info.json`. Verify the source commit and checksum, then authenticate to the intended npm account and publish **the tarball**, not the source directory (which does not contain built Wasm).

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish ./tessembly-0.1.0.tgz --access public --ignore-scripts
npm view tessembly@0.1.0 dist.integrity --registry=https://registry.npmjs.org/
```

Interactive publication may request the account's configured 2FA. Do not add CI provenance flags to this local command: no GitHub OIDC context exists on a normal desktop. Compare the registry integrity to build-info.json.

로컬 방식은 로그인할 npm 계정을 브라우저에서 직접 선택할 수 있으므로 GitHub와 이메일이 달라도 진행할 수 있습니다. GitHub Secrets 없이 최초 등록할 때 적합합니다. 로그인한 뒤 소스 폴더가 아닌 검증된 `.tgz` 파일을 배포하고 integrity를 비교하세요.

## Subsequent OIDC publishing / 이후 토큰 없는 배포

After the package exists, configure its npm **Trusted Publisher**:

| Field | Value |
|---|---|
| Provider | GitHub Actions |
| Organization or user | daejunnom |
| Repository | Tessembly |
| Workflow filename | npm-release.yml |
| Environment | npm |
| Allowed command | npm publish for this direct-publishing workflow |

The workflow filename, case and environment must match exactly. This is not the workflow display title. New trusted-publisher configurations may allow only staged publication by default; explicitly permit direct `npm publish` for this workflow. Hosted GitHub runners, `id-token: write`, Node 22.14+ and npm 11.5.1+ are required by npm's trusted-publishing documentation; the workflow uses Node 24. `npm whoami` is not an OIDC-readiness test.

Run with authentication **oidc** and the next intentionally committed package version. The OIDC publish step receives no `NPM_TOKEN`. Confirm a real subsequent publish and integrity check before revoking the initial token. The registry will not permit overwriting the already published version.

패키지가 존재한 뒤 npm Trusted Publisher에서 위 값을 등록합니다. 새 설정의 기본 허용 명령이 staged publishing일 수 있으므로 이 직접 배포 워크플로에는 `npm publish`를 명시적으로 허용하세요. 다음 버전을 의도적으로 올린 뒤 `oidc` 방식으로 배포하고 성공 확인 후 최초 토큰을 폐기합니다. 동일 버전 재업로드는 허용되지 않습니다.

## Dependency and licensing boundaries / 의존성과 라이선스

The npm manifest contains no dependencies, optional dependencies, peer dependencies, bundled dependencies or development dependencies. No install hook downloads or builds anything. Wasm is a shipped package asset; a browser may fetch it from the application's own origin, or accept bytes/Module. Node built-ins and WebAssembly APIs are platform facilities.

The Svelte documentation and optional external-developer TCK are separate. Native CLI/TCK JSON transport still uses serde_json; it is not linked into the npm Wasm build. Zero npm dependencies does not claim there is no bundled code or no standard library.

The owner has not selected an open-source license. Metadata remains **UNLICENSED** rather than inventing a license grant. Publishing a public package does not settle licensing.

## Official references

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/creating-and-viewing-access-tokens/
- https://docs.npmjs.com/configuring-two-factor-authentication/
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

# OIDC publication and recovery / OIDC 배포와 확인 복구

## Confirmed 0.1.1 publication / 확인된 기존 배포

**0.1.1 was published successfully using OIDC.** Run [34057455742](https://github.com/daejunnom/Tessembly/actions/runs/34057455742) failed only in the old post-upload checker after about 38 seconds. The registry metadata, actual tarball SHA-512 and MIT body are confirmed by read-only run [34059805571](https://github.com/daejunnom/Tessembly/actions/runs/34059805571). Do not reset Trusted Publisher, delete the version or upload it again.

**0.1.1은 OIDC로 이미 배포됐습니다.** 최종 공개 확인만 실패했습니다. 레지스트리 정보와 실제 파일의 일치가 확인됐으므로 인증 설정을 다시 바꾸거나 삭제·재업로드하지 마세요.

```sh
node scripts/release-contract.mjs recover docs/release-receipts/0.1.1.json
```

The receipt binds the original source and digest; this command only reads public registry metadata and bytes. The `Recover published 0.1.1 evidence` workflow performs the same check with no npm credentials. An old red Actions run remains historical evidence, not the current package state.

영수증은 최초 소스·해시에 결속되며 위 명령은 공개 정보를 읽기만 합니다. 과거 실패 실행은 그대로 남지만 현재 레지스트리 상태를 의미하지 않습니다.

## Next release / 다음 배포

The current platform/security candidate is **0.1.2**. Start a NEW manual `Publish npm package` run:

| Input | Value |
|---|---|
| Branch | main |
| mode | publish |
| expected_version | 0.1.2 |

`verify-only` is the safe default: it builds and validates without uploading or testing npm authorization. `publish` uploads the exact verified MIT tarball. Native platform tests, installed npm consumer tests and the separate security audit must pass first. Source pushes and passing builds do not publish automatically. Never rerun the old token bootstrap job to publish the new source.

현재 보강 후보는 **0.1.2**입니다. 새 Run workflow에서 `main / publish / 0.1.2`를 지정하세요. `verify-only`는 실제 npm 인증을 시험하지 않습니다. 네이티브·npm 플랫폼·별도 보안 검증 뒤 검증한 압축 파일만 공개하며 소스 push로 자동 배포하지 않습니다.

## Existing trusted publisher / 유지할 설정

| npm field | Value |
|---|---|
| Provider | GitHub Actions |
| Organization or user | daejunnom |
| Repository | Tessembly |
| Workflow filename | npm-release.yml |
| Environment | npm |
| Allowed direct command | npm publish |

The exact filename is neither the workflow title nor `.github/workflows/npm-release.yml`. Environment/case must match. Stage-only permission is insufficient for this direct workflow. Existing working OIDC settings do not need recreating. GitHub/npm login emails need not match; Linked Accounts recovery is not publishing authorization.

npm requires an eligible hosted runner, `id-token: write`, npm 11.5.1+ and Node 22.14.0+. This workflow uses Node 24 and checks the actual npm version. It sets isolated registry-only npm configuration, does not load NPM_TOKEN and does not fall back to tokens. The publish job alone receives OIDC permission. A visible OIDC endpoint or successful `verify-only` is not proof of npm authorization.

정확한 파일명·대소문자·`npm` 환경을 유지하세요. 기존 성공한 OIDC 설정은 재등록할 필요가 없습니다. 별도 Google 계정이나 GitHub 이메일을 합칠 필요도 없고 토큰 Secret도 새로 필요하지 않습니다. 환경 승인이 설정되어 있으면 승인 절차를 따르세요.

## Result states / 결과 상태

| Result | Meaning |
|---|---|
| UNPUBLISHED | This version is not visible before upload. |
| ALREADY_PUBLISHED_EXACT | Existing metadata, actual bytes and MIT body match; skip upload. |
| VERSION_ALREADY_PUBLISHED_MISMATCH | Another artifact owns this immutable version; stop. |
| PUBLISH_ACCEPTED_VISIBILITY_PENDING | Metadata or tarball visibility is delayed. |
| PUBLISHED_AND_VERIFIED | Public metadata, downloaded bytes and MIT text match the original receipt. |
| PUBLISH_ACCEPTED_BUT_UNVERIFIED | Confirmation budget exhausted; inspect the ORIGINAL artifact, not a new upload. |

Confirmation retries only transient conditions for at most five minutes plus an in-flight request deadline. Actual metadata/digest mismatch or authorization failure is not treated as propagation. Responses and compressed/inflated archives are bounded. Inspection does not extract paths or execute package code. Existing-version idempotence requires the exact same verified file; it does not bless a different rebuilt artifact.

반영 지연·무결성 불일치·권한 실패를 구분합니다. 원래 업로드 파일과 같으면 재업로드 없이 확인하고, 다르면 중단합니다. 모호한 실패를 성공이라고 표시하거나 버전을 자동 증가시키지 않습니다.

## Verification and token retirement / 완료 확인과 토큰 폐기

```sh
npm view tessembly@0.1.2 version license dist.integrity --registry=https://registry.npmjs.org/
npm view tessembly@0.1.2 dist.attestations --json --registry=https://registry.npmjs.org/
```

Compare the registry integrity with `build-info.json` from that same run. The final workflow also downloads and hashes the actual tarball and checks MIT text. Provenance and OIDC are related but distinct: a provenance badge alone does not prove no token was loaded by a workflow.

After actual OIDC publication has been verified, revoke the npm bootstrap token and remove any NPM_TOKEN repository/environment Secret. Deleting a GitHub Secret does not revoke the npm token. Keep account 2FA and recovery options enabled. Restrict traditional token publishing as appropriate; do not automatically weaken an organization policy.

마지막 레지스트리·실제 파일 검증까지 확인하세요. 이미 확인된 OIDC 배포 후 최초 npm 토큰을 폐기하고 GitHub Secret도 삭제할 수 있지만 둘은 별도 작업입니다. 계정 2FA·복구 설정은 유지하세요.

## Dependencies, licenses and scope

The npm package has no dependencies/peer/optional/bundled/dev dependencies or installation hooks. The Wasm build uses only Rust standard-library and local format crates. Native CLI/TCK serde_json and Svelte docs remain outside the npm runtime. MIT applies to project code/docs; third-party components retain their licenses. Neither this release nor its tests implement dataset adapters, PC solvers or replay engines.

Official references: https://docs.npmjs.com/trusted-publishers/ ; https://docs.npmjs.com/generating-provenance-statements/ ; https://docs.npmjs.com/cli/v11/commands/npm-publish/ .

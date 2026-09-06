# MIT licensing and OIDC publishing / MIT 라이선스와 OIDC 배포

## Release state / 배포 상태

The initial `tessembly@0.1.0` bootstrap-token release succeeded in [run 34055804449](https://github.com/daejunnom/Tessembly/actions/runs/34055804449). Its OIDC step was intentionally skipped because the token route was selected. This proves initial publication, **not** Trusted Publisher authorization.

`0.1.1` is the next npm package version prepared with **MIT** metadata and a bundled `LICENSE`. The repository, local Rust crates and project documentation are MIT; third-party components retain their own licenses. The initial `0.1.0` registry entry and tarball are historical artifacts and are not overwritten. A new version is needed for the corrected npm metadata and license file. Format profiles and wire versions do not change for this license-only package release.

최초 `0.1.0` 배포는 성공했습니다. token 경로에서 Trusted publish 단계가 건너뛰어진 것은 정상이며 OIDC 인증이 검증됐다는 뜻은 아닙니다. 소유자의 요청으로 저장소와 npm 패키지에 MIT를 부여하고 다음 npm 버전을 `0.1.1`로 준비했습니다. 이미 공개된 `0.1.0` 파일이나 메타데이터를 덮어쓰지 않습니다. 이 문서 또는 빌드 성공만으로 `0.1.1`이 공개됐다고 판단하지 마세요.

## One-time npm setup / npm에서 한 번 설정

Sign in to the npm account that owns **tessembly** and open the package's **Settings → Trusted Publisher / Trusted publishing**. Add a GitHub Actions publisher with these exact values:

| Field / 항목 | Value / 값 |
|---|---|
| Provider | GitHub Actions |
| Organization or user | `daejunnom` |
| Repository | `Tessembly` |
| Workflow filename | `npm-release.yml` |
| Environment name | `npm` |
| Allowed actions | Enable **`npm publish`** for this direct-publishing workflow |

Use the **filename only**, not `.github/workflows/npm-release.yml`, the workflow display title, or `npm.yml`. The reusable `npm.yml` only builds the package; publication happens in `npm-release.yml`. Repository spelling and environment must match. `repository.url` in the packed manifest is `git+https://github.com/daejunnom/Tessembly.git`.

새 Trusted Publisher에서는 `npm stage publish`만 기본 허용될 수 있습니다. 이 워크플로는 직접 배포이므로 **`npm publish` 허용을 선택**하세요. staged 배포만 허용하려는 경우 현재 직접 배포 워크플로와 맞지 않습니다. 이를 우회하거나 토큰으로 자동 재시도하지 않습니다. 잘못된 필수 항목으로 저장했다면 npm 안내에 따라 해당 연결을 삭제하고 정확한 값으로 다시 만드세요.

Different npm/Google and GitHub account emails do not need to be merged. Package ownership and the exact trusted workflow determine publishing permission. Linked Accounts & Recovery Option is not this publisher configuration. Never send npm tokens, OTPs, passkeys or recovery codes to chat or source files.

## GitHub environment / GitHub 환경

The publish job uses environment **`npm`** and a GitHub-hosted Ubuntu runner. In **Settings → Environments → npm**, allow the intended **main** branch. Required reviewers are optional; when enabled, an authorized reviewer must approve the job. The workflow itself accepts releases only from `main`. These protections are configured by the repository owner; the source change does not silently edit environment protection or account settings.

`id-token: write` is granted only to the publish job. Node 24 is selected and the workflow checks npm >= 11.5.1 and Node >= 22.14.0. The job writes isolated npm config files containing no credentials. It never references `secrets.NPM_TOKEN`, does not run `npm login`, and has no automatic token fallback.

저장소나 environment에 기존 `NPM_TOKEN`이 남아 있어도 새 배포 워크플로는 읽지 않습니다. npm 계정 설정과 GitHub 환경 승인은 소유자가 수행합니다. 토큰을 제거하기 전 실제 OIDC 배포 성공부터 확인하세요.

## Run the current workflow / 현재 워크플로 실행

Open **Actions → Publish npm package → Run workflow** on **main**. Start a **new run**; do not rerun the historical bootstrap-token job, which uses its old workflow commit.

| Input / 입력 | Preparation / 준비 검사 | Real release / 실제 배포 |
|---|---|---|
| Branch | `main` | `main` |
| `mode` | `verify-only` (default) | `publish` |
| `expected_version` | `0.1.1` | `0.1.1` |

There is no longer an authentication selector: this workflow is **OIDC only**. `verify-only` builds, tests and validates the package, license, exact source SHA, integrity and availability of the requested version. It does not publish, exchange npm credentials or validate npm's Trusted Publisher grant. Presence of GitHub OIDC environment variables, `npm whoami`, and `npm publish --dry-run` are **not** evidence of working npm OIDC publication.

실제 배포는 `mode=publish`를 명시적으로 선택합니다. MIT 압축 파일과 검증된 파일이 같은지 확인한 뒤 OIDC로 직접 배포하고, npm registry의 이름·버전·MIT 라이선스·SHA-512·의존성 0개를 다시 확인합니다. 마지막 단계까지 성공했을 때만 배포 완료입니다. 기존 버전은 덮어쓰거나 자동 증가시키지 않습니다.

The workflow requests provenance for the public package/public repository. A failed publish is not retried under a different identity. If publication succeeds but the final registry check temporarily fails, first inspect the registry before retrying: a published version is immutable.

## Confirm and retire bootstrap credentials / 확인 후 초기 토큰 폐기

After a successful OIDC release, inspect the package page and public registry metadata:

```sh
npm view tessembly@0.1.1 version license dist.integrity --registry=https://registry.npmjs.org/
npm view tessembly@0.1.1 dist.attestations --json --registry=https://registry.npmjs.org/
```

Compare `dist.integrity` with the run's `build-info.json`. The metadata must show `license: MIT`; verify provenance on npm as well. Then restrict npm **Publishing access** to **Require two-factor authentication and disallow tokens**, revoke the initial npm token on npm, and remove `NPM_TOKEN` from both repository and environment Secrets if present. Deleting a GitHub Secret does not revoke the original npm token. Keep account 2FA and recovery options enabled.

OIDC 실제 배포와 registry 검사가 성공한 뒤에만 최초 토큰을 폐기합니다. npm 토큰 폐기와 GitHub Secret 삭제는 서로 다른 작업입니다. 패키지의 전통적 토큰 배포를 금지해도 설정된 Trusted Publisher의 OIDC 배포는 유지됩니다.

## Troubleshooting / 문제 해결

| Symptom | Check |
|---|---|
| `verify-only` succeeded | Expected: no publication and no npm authentication check occurred. |
| OIDC publish fails / E404 or E403 | Check package ownership, exact workflow filename, repository case, environment and direct `npm publish` permission. Do not treat every 404 as a missing package. |
| Job awaits approval | Approve the `npm` environment through its configured reviewer policy. |
| `VERSION_ALREADY_PUBLISHED` | Inspect the existing version; do not overwrite, unpublish/reuse or automatically bump it. |
| `ARTIFACT_*`, `PACKED_*`, `LICENSE_*` | Artifact or source identity is inconsistent. Rebuild the committed source; never bypass these checks. |
| GitHub OIDC variables unavailable | Check the hosted runner and publish job's `id-token: write` permission. |
| `PUBLISH_UNVERIFIED` | Verify registry metadata before another attempt; the upload may already have succeeded. |

## Dependency boundary / 의존성 경계

The npm manifest has no dependencies, optional/peer/bundled dependencies or devDependencies. No install hook downloads or compiles anything. The Wasm build uses Rust's standard library and local format crates, without registry crates. Node built-ins and WebAssembly are platform facilities. Svelte docs and external-developer TCK tooling remain separate. Native CLI/TCK JSON transport still uses `serde_json`, which is not linked into npm Wasm.

The packaging checks require the root and npm `LICENSE` to match, require MIT metadata, and inspect the real tarball without importing its JavaScript. MIT licensing does not relicense third-party code. It also does not change any syntax, observation policy, solver or external-dataset responsibility.

## Official references / 공식 자료

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/cli/v11/commands/npm-publish/
- https://docs.npmjs.com/staged-publishing/
- https://opensource.org/license/mit

# Security policy / 보안 정책

Tessembly parses and exchanges **untrusted text and bytes**, but it is not a sandbox for executable code, a game engine, or a dataset client. The npm package has no external package dependencies; that does not mean it is immune to vulnerabilities.

The 0.1.2 release candidate hardens resource handling compared with 0.1.0–0.1.1. Source changes and a passing build are not proof that an npm version is already published. Check the registry and release evidence before choosing a version.

테섬블리는 신뢰하지 않는 텍스트·바이너리를 처리하지만 실행 코드용 샌드박스는 아닙니다. 0.1.2 배포 후보에는 자원 제한 보강이 포함됩니다. 기존 버전의 재배포나 삭제 대신 새 패치 버전을 사용하며, 레지스트리 공개 여부는 별도로 확인합니다.

## Reporting

Do not include credentials, private datasets or user data in public issues. Use the repository's **Security → Report a vulnerability** when GitHub private reporting is enabled. If that option is unavailable, contact the maintainer through an established private channel, or open a minimal public request for a private contact without exploit details or sensitive data. We do not claim a response SLA or external certification.

공개 이슈에 토큰·개인 데이터·민감한 재현 자료를 올리지 마세요. GitHub 비공개 취약점 신고가 활성화되어 있으면 해당 기능을 사용하고, 없으면 기존 비공개 연락 경로나 민감한 상세 없이 연락 방법만 요청하세요.

## Supported trust boundaries

- Text: 65,536 UTF-8 bytes; nesting: 48; aggregate decoded nodes and relation terms: 4,096 each. Embedded patterns share the document budget. Finite supply length: 256.
- Packaged Wasm: 32 MiB maximum **linear memory per instance**. This excludes JavaScript memory, process RSS, engine/compiler memory and other instances. `dispose()` drops the instance reference; immediate reclamation is controlled by the runtime.
- Oversized strings/files/assets are rejected before expensive copies or interpretation. Actual streamed bytes, not just `Content-Length`, are counted. Unexpected Wasm traps invalidate the instance.
- Paths, commands, `wasm`/`wasmUrl`, and manually constructed executable modules are **trusted host configuration**, never document-directed capabilities. Consumer code must not take them directly from an untrusted document.
- Native and npm CLI binary output creates a new file; existing files, including symlink targets, are not intentionally overwritten. Caller-selected input paths are not confined to a directory; hostile filesystem races and network filesystems require host-level controls.
- TCK is an optional external-developer tool. It bounds direct-child I/O and response diagnostics, but does not provide process-tree isolation. A descendant retaining inherited pipes may outlive the test. Run only trusted commands, or put the entire tool in an OS/container sandbox with CPU, memory and process-count limits.
- Publication validates the exact source identity, tarball, license and registry bytes. npm processing delay is separate from upload/authentication failure. Do not repeatedly publish an accepted version.

## Consumer deployment requirements

For a public service, set request-size, concurrency, CPU/time and process/container memory limits. Use a dedicated Worker or child process when cancellation or isolation is required; JavaScript Promise timeouts do not interrupt synchronous Wasm execution. Do not share mutable Wasm instances across unrelated requests without an ownership policy. Keep browsers, Node.js, Rust toolchains and OS runtimes patched.

공개 서비스에서는 요청 크기·동시성·CPU·시간·프로세스 메모리 제한을 별도로 적용하세요. 동기 Wasm은 Promise 타임아웃만으로 중단되지 않습니다. 메모리 상한은 프로세스 전체에 적용되는 보장이 아닙니다.

See [the scoped security review](docs/SECURITY_REVIEW.md), [platform contracts](docs/PLATFORMS.md) and [publication recovery](docs/PUBLISHING.md).

# npm 0.1.1 — MIT / OIDC preparation

This change prepares a new npm artifact; it does not itself publish it.

- Add the owner-authorized MIT grant to the repository, project crate metadata and npm tarball.
- Keep the existing RFC2 semantics, wire versions and public APIs unchanged.
- Preserve zero npm dependencies, zero Wasm imports and no install-time scripts.
- Switch the manual release workflow to OIDC-only authentication, without NPM_TOKEN access or token fallback.
- Add verify-only mode, exact tarball license/integrity checks and explicit post-publish registry checks.
- Update English/Korean Pages and the publishing guide with the exact Trusted Publisher fields.

Published npm 0.1.0 is not overwritten. Rust package versions remain 0.1.0 because the implementation has not changed; the npm license-bearing artifact is version 0.1.1.

이 변경은 MIT npm 배포물 0.1.1을 준비합니다. 실제 공개는 소유자가 Trusted Publisher를 설정하고 main에서 mode=publish로 수동 실행한 뒤 registry 검증까지 성공해야 완료됩니다. 기존 0.1.0 압축 파일, 의미 규칙, API 또는 외부 개발자의 연동 책임을 변경하지 않습니다.

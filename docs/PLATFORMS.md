# Platform contracts / 실행 환경

The same Rust implementation is used by the native libraries and the zero-dependency npm Wasm asset. The npm package intentionally has no OS-specific optional packages or installation hooks.

## Native validation matrix

| CI host | Rust target | Scope |
|---|---|---|
| Ubuntu 22.04 x64 | x86_64-unknown-linux-gnu | native CLI, libraries, TCK, adversarial tests |
| Ubuntu 24.04 x64 | x86_64-unknown-linux-gnu | same |
| Ubuntu 24.04 x64 | x86_64-unknown-linux-musl | statically linked musl build executed on the Ubuntu host |
| Windows Server 2022 x64 | x86_64-pc-windows-msvc | Windows CLI, library/TCK contracts |
| macOS 15 Intel | x86_64-apple-darwin | Intel macOS native binaries |
| macOS 14 Apple Silicon | aarch64-apple-darwin | ARM64 macOS native binaries |

Rust 1.85.0 is pinned. Each matrix row compiles, tests and runs actual target executables; artifacts carry target, source commit, MIT license and SHA-256 values. The CI run is the evidence for a particular commit, not an unconditional compatibility guarantee.

Linux is not separate from Ubuntu: Ubuntu is one tested Linux distribution. The musl binary is additionally built and executed, but this matrix does not claim native testing on every Linux distribution, every glibc release, Alpine, Linux ARM64 or Windows ARM64. Windows testing uses Server 2022 rather than a Windows 10/11 desktop image. macOS artifacts are not signed/notarized, and no installer/signing entitlement is implied.

## npm matrix

One identical npm tarball is installed with lifecycle scripts disabled on Ubuntu 22.04/24.04, Windows 2022, macOS Intel 15 and macOS ARM64 14, with **Node.js 22 and 24** on each. The public installed API, CLI with spaces/Unicode paths, malformed inputs and memory ceiling are exercised. Browser testing uses Chromium with English, Korean and non-Korean fallback locales; it is not a claim of testing every browser engine.

No native addon, postinstall download, Rust/Python installation or third-party npm dependency is required. WebAssembly, TextEncoder and the Node standard modules are platform facilities.

## Running native binaries

Download the artifact matching the exact target; on Windows use the `.exe` files. After a ZIP extraction on Unix, an executable permission may need restoring. Read the artifact's `build-info.json` and compare the checksums before running. OS trust/notarization warnings must not be described as application functional test failures.

## 한국어 요약

Windows x64, Linux의 Ubuntu 22.04·24.04 및 musl, macOS Intel·Apple Silicon을 각각 빌드·실행 검사합니다. 동일한 npm 압축 파일도 다섯 OS 구성과 Node 22·24의 10개 조합에 실제 설치합니다. Linux 전체 배포판·Windows ARM·Linux ARM·모든 브라우저·코드 서명까지 검사했다고 주장하지 않습니다. 문서의 지원 대상과 실제 커밋의 CI 성공 증거를 함께 확인하세요.

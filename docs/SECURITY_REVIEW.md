# Security review: resource and execution boundaries / 보안 점검

Review target: Tessembly 0.1.2 candidate, against the 0.1.1 published source `32a7d6b130916bb3e759a49eead9832032273f9f`. This is a source review plus bounded regression/advisory testing, **not an independent third-party penetration test, formal proof, or guarantee against all attacks**. No vulnerabilities in other repositories were probed and no private data was used.

## Findings and changes

| ID | Boundary and exposure | Change | Regression evidence |
|---|---|---|---|
| SEC-01 | JS text/file and Wasm asset inputs could be copied in full before library size rejection; potentially large memory spikes for untrusted caller input | UTF-16 preliminary length and UTF-8 checks; bounded regular-file reads; decoded HTTP-stream byte limit, deadline; shared mutable binary inputs rejected | oversized strings, sparse 32 MB input, directories, lone surrogates, lying Content-Length |
| SEC-02 | Embedded pattern decoding/typed validation reset node and relation counters; a document could multiply per-pattern budgets | shared document-wide model counters; charge before allocations/recursive visits; typed host config checked before cloning; portable span bounds | two 2,050-term patterns, hand-built nested wire, absurd spans and typed config |
| SEC-03 | Optional TCK enumeration copied U predicates across permutations before charging the budget | charge estimated cells before cloning large predicate collections | 4,096 U terms on P7 return INCOMPLETE before expansion amplification |
| SEC-04 | Packaged Wasm had no explicit maximum linear memory and a trapped instance could be reused | 32 MiB module maximum; quarantine unexpected traps; idempotent disposal | actual memory.grow denial, trap fixture and subsequent-call rejection, malformed calls followed by a valid call |
| SEC-05 | Optional TCK could block on stdin or on inherited stdout after direct-child exit, and retain large failure payloads | deadline covers read/write/exit; response cap and bounded diagnostic preview; pending reader/writer permits; stop after transport failure | input backpressure, inherited pipe, oversized output, bounded diagnostic retention |
| SEC-06 | Native/npm file outputs could truncate an existing output; npm CLI dispatched through inherited object properties | exclusive creation, regular-file checks, own-property dispatch, direct executable arguments | existing-output refusal, Unicode/spaces/metacharacter paths, constructor command rejection |
| SEC-07 | Release inspection used external tar and unbounded local archive reads | compressed/decompressed/entry-count/entry-size ceilings, strict archive path/type/checksum checks, no extraction or package-code execution | traversal, absolute path, links, duplicate entries, malformed headers, decompression bomb |
| SEC-08 | Upload acceptance was conflated with registry visibility, producing a failed run after successful OIDC publication | bounded longer confirmation, explicit transient/terminal reasons, exact immutable-artifact idempotence, read-only recovery receipts | delayed visibility past old 38-second window; metadata/bytes mismatch; authorization failure; no repeated publish |

These findings concern resource exhaustion and boundary correctness. Severity depends on whether a consumer exposes the corresponding input to remote users. TCK paths are developer-only; no claim of a demonstrated remote code-execution exploit or CVE assignment is made.

## Review coverage

Text/AST/typed models: depth, total nodes, total predicates, string bytes, relation self-cycles, source length, integer/spans, repeated patterns, config conflicts. Binary decoders: truncated lengths, unknown tags/critical sections, malformed UTF-8, opaque metadata, aggregate embedded budgets. JavaScript: premature allocation, input type and shared-buffer rejection, prototype-inherited dispatch, traps, output ownership and disposal. Native tools: regular files, output creation, child-process argument boundaries and inherited pipes. Release: checksums, immutable versions, token-free OIDC, pinned actions, compressed archives, credential-file exclusion. Pages: escaped authored content and language routing; documentation is not an executable document-input service.

The regression corpus performs **10,000 deterministic bounded mutations**, not coverage-guided fuzzing. Accepted decoder outputs must round-trip structurally. Separate CI reruns these cases after platform consumer validation and queries OSV by exact versions from the committed Cargo and documentation npm locks; `npm audit` covers the documentation dependencies as well. API outages are inspection failures, not evidence of zero vulnerabilities. Dependency results carry a timestamp and do not guarantee future advisory status.

## Hard ceilings and non-guarantees

| Resource | Reference limit |
|---|---|
| Text input / aggregate model strings | 65,536 bytes |
| Model depth | 48 |
| Aggregate nodes / relation terms | 4,096 each |
| Finite supply / hold queue | 256 pieces |
| Document wire | 1 MiB |
| JS binary admission | 1 MiB + 16 bytes; decoder-specific limit still applies |
| Executable Wasm asset | 2 MiB |
| Packaged Wasm linear memory | 32 MiB per instance |
| Optional TCK request / response | 4 MiB / 8 MiB |
| TCK retained failure preview | approximately 8 KiB per failure |
| Release archive compressed / inflated | 2 MiB / 8 MiB |

32 MiB is **not** a cap on Node/V8/browser RSS, OS stack, user-created input, all concurrent instances or caller-supplied replacement Wasm. The memory probe reports process RSS descriptively; it does not make RSS a portable pass/fail invariant. A runtime may retain freed memory. Native callers that construct enormous owned Rust trees before calling the library are responsible for constructing and dropping those allocations safely.

## Remaining host duties

Use patched runtimes and OSes, concurrency/memory/CPU quotas and cancellation-capable worker/process isolation for public services. The format never grants arbitrary file/network/command capabilities. Paths and alternative Wasm modules are trusted configuration; this library does not jail filesystem access, hostile TOCTOU races, network filesystems or descendant processes. A custom Wasm module is executable code and can loop indefinitely; a Promise timeout cannot interrupt it.

No sanitizer/Miri campaign, long-running coverage-guided fuzzing, browser-engine penetration test, malicious multi-user host audit, formal verification or cryptographic constant-time guarantee was performed in this review. The library handles public format data, not secrets or authentication. Do not convert UNSUPPORTED, INCOMPLETE or NOT_CHECKED into exact zero solutions.

## 한국어 요약

입력 복사 전 크기 제한, 내장 패턴의 전체 예산 공유, U 조건 복제 전 제한, Wasm 32MiB 상한과 트랩 후 재사용 차단, 외부 개발자용 TCK의 I/O 시간 제한, 파일 덮어쓰기 거부, 배포 압축 파일 검사와 OIDC 공개 확인 복구를 보강했습니다. 이는 범위를 명시한 코드 점검·회귀시험이며 모든 공격에 안전하다는 보증이 아닙니다. 프로세스 전체 메모리·동시성·외부 코드 실행·OS 샌드박스·실제 PC 엔진 검증은 소비자가 담당합니다.

## Evidence

The CI runs for the exact source commit provide native matrix results, installed npm consumer results, per-platform `resource-report.json`, and `separate-security-evidence/dependency-audit.json`. A release artifact is uploaded as `tessembly-npm-package` only after those npm platform and separate security jobs succeed. Publication itself remains a separate OIDC-only manual action. See the final run URLs in the delivery report rather than treating this description of tests as proof that they have all run.

Primary specifications used: https://lld.llvm.org/WebAssembly.html ; https://docs.npmjs.com/trusted-publishers/ ; https://google.github.io/osv.dev/api/ ; https://nodejs.org/api/fs.html .

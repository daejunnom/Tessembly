# Tessembly — English help

Semantic profile: tessembly.rfc2.precedence.v1

RFC2: A>B means A first; A<B means B first. Compare first occurrences inside
the exact scope. The earlier kind must occur; the later kind may be absent.
Neither present means false. A later piece is not promised outside the scope.
Bare kinds require presence. TS means both kinds, not their adjacency or order.
Commas mean AND. Chains expand into adjacent cross-pair comparisons. Braces {}
group a scope, not a new bag. RFC1 files are never silently migrated.

Examples:
  P4:D(T)
  P4:D(I<TS)
  P4:D(I<T>S) = P4:D(T>IS)
  P4:D(I>T,T)
  {T[^T]!}:D(I>O)P4
  P7:D(I>T)U(T>I)

Commands:
  tessembly [--lang en|ko|auto] help
  tessembly lint --profile rfc2 [--deny-unsat] FILE...
  tessembly format --profile rfc2 FILE
  tessembly encode --profile rfc2 INPUT.tsm OUTPUT.tsmb
  tessembly decode INPUT.tsmb OUTPUT.tsm
  tessembly doc-check [--deny-unsat] FILE.tsmd...
  tessembly doc-format FILE.tsmd
  tessembly doc-encode INPUT.tsmd OUTPUT.tsmb
  tessembly doc-decode INPUT.tsmb OUTPUT.tsmd

Native CLI language: --lang overrides TESSEMBLY_LANG and standard locale
environment variables. Korean primary values select Korean; all others select
English. On desktops without locale environment variables, set --lang or use
the npm CLI, which can also read the locale through the platform Intl API.
Machine JSON, status/error codes, byte spans and format data are never translated.

External-developer tools (optional, not a product runtime):
  tessembly-tck --report report.json -- YOUR_HOST test-port
  tessembly-document-tck --report report.json -- YOUR_HOST doc-port

The checker proves local contradictions, not general satisfiability. No cycle
means NOT_CHECKED, not a PC proof. U checks source/use relations, not placement
legality. NONE, EMPTY, occupied hold and this-turn locking are separate states.
Active-kind hold restrictions have no compact shorthand.

Advanced declarations preserve sources, environments, references and decision
points. Consumers implement randomizer execution, see-n evaluation, PC search,
replay and dataset/application adapters. References are never automatically
fetched. Documentation and optional conformance tools are separate from runtime.

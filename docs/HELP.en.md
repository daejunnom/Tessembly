# Tessembly — English help

Implemented reference: `tessembly.rfc3.order.v1`, F1/F2 in 0.3.x.

## Compact syntax

Add uppercase D and U constraints to Clearra-style queues and patterns. The input structure determines the exact scope.

### Supply expressions

| Expression | Exact meaning |
| --- | --- |
| IOTSZJL | Fixed supply order |
| P4 | All orders of four distinct kinds selected from seven |
| P7P4 | Concatenate two independent permutation segments |
| [ITO] | Choose one of I, T, O |
| [ITO]2 | Choose two distinct kinds, in every order |
| [ITO]! | Permute the complete set |
| [^T] | Choose one standard kind other than T |
| * / *! | One arbitrary kind / all seven permutations |
| IOT;ITO | Union of two alternatives |

Repeated letters in brackets repeat a kind, not its count. [TTI]! is not a two-T bag. Use advanced bag or shuffle for multiplicities. Alternatives must have equal length in this profile.

### Colon and braces

```text
P7:D(I<T)P4
P7P4:D(I<T)
{T[^T]!}:D(I<O)P4
{P7P4}:D(I<T)
P7:D(I<T,T)U(T<I)
```

A colon attaches to the immediately preceding complete supply expression: P7 in the first line, P4 in the second. Braces group expressions into one scope. D and U can follow one colon, but each block appears at most once per scope.

> Braces do not create bag boundaries. P3P3 consists of independent pools and is not P6. Brackets specify choices/permutations, not a brace scope.

### Order, groups and mixed chains

| RFC3 | Meaning |
| --- | --- |
| A<B | A precedes B |
| A>B | B precedes A |
| I<TS | I precedes T and S; T/S remain unordered |
| I<T>S | I and S precede T |
| T>IS | Equivalent to I<T>S |

```text
P4:D(I<T)
P4:D(I<TS)
P4:D(I<T>S)
P4:D(T>IS)
P4:D(I<T,T)
```

Bare kinds compare first occurrences inside the attached scope. Groups mean all cross-pairs (AND); mixed chains compare adjacent groups only. I<IT includes I<I and cannot hold. Repeating a kind as TT does not select its second occurrence.

### Presence, absence and partial information

Bare T requires presence; TS requires both kinds, not adjacency, an order or OR. In D(I<T), earlier I must exist while later T may be absent. Use D(I<T,T) to require T as well.

| Closed scope | D(I<T) |
| --- | --- |
| IT | true |
| TI | false |
| IOSZ | true |
| TOSZ | false |
| OSZJ | false |
| ITIT | true |
| TIIT | false |

```text
P4:D(T)
P4:D(TS)
P4:D(I<T,T)
```

> Do not inspect pieces outside the scope. An absent later kind is not a promise of future arrival. Hidden is not absent: an unfinished observation/use window must not be treated as a closed supply.

### Condition lists and D/U

```text
P7:D(I<T<S)
P7:D(I<T,T<S)
P7:D(I<T<S<I)
P7:D(I<T)U(T<I)
```

Commas AND complete expressions. I<T<S means I<T AND T<S. D checks supply order; U checks the use-order projection for the same source scope. These domains must not share a contradiction graph.

A strict cycle is syntactically valid but proves UNSAT in its own scope. No proof means NOT_CHECKED, not PC/hold/placement legality. Resource exhaustion is INCOMPLETE, not an exact empty result.

### Counts and concrete cases

| Pattern | Distinct supplies |
| --- | --- |
| P4 | 840 |
| P4:D(T) | 480 |
| P4:D(TS) | 240 |
| P4:D(I<T) | 360 |
| P4:D(I<T,T) | 120 |
| P4:D(I<TS) | 272 |
| P4:D(I<T>S) | 176 |

These are pure standard-kind sets, not initial-state filters or PC success rates. Reversed comparisons can have identical counts, so exact queues and truth-table members are checked too.

## Logic, windows and occurrences

Implemented in 0.3.x: &, |, !, count comparisons, IN windows and kind[n] selectors, including errors.

### Logical, not bitwise operators

```text
P4:D(I<T&T)
P4:D(I<T|S<Z)
P4:D(!T)
P4:D(!(I<T))
P4:D((I<T|S<Z)&T)
```

| Symbol | Meaning |
| --- | --- |
| & | Logical AND; semantics of C && |
| \| | Logical OR; semantics of C \|\| |
| ! | Logical NOT; !T requires T absent |
| () | Boolean grouping |

Precedence is grouped/atomic conditions, NOT, AND, OR. Validate the entire syntax, features and windows first; then short-circuit valid conditions left to right. T|IN(1,5,I) is a window error on P4 even when T is present.

> !(I<T) is not T<I: with neither kind present, only the former is true. !I<T is rejected rather than guessed. Logical operators borrow C semantics, but kind groups, comparison chains and comma lists retain Tessembly semantics.

### Commas, grouping and chains

| Input | Equivalent |
| --- | --- |
| D(I\|T&S) | D(I\|(T&S)) |
| D(I\|T,S) | D((I\|T)&S) |
| D(I<T<S) | D(I<T&T<S) |
| D(I<T>S) | D(T>IS) |

```text
P4:D(I|T&S)
P4:D(I|T,S)
P4:D((I|T)&S)
```

A comma separates outer condition-list items. Use & and | inside a Boolean grouping. Commas in IN and advanced calls delimit their arguments. Do not conflate these contexts by textual replacement.

### Per-kind counts and bare presence

```text
P4:D(T=1&S=0)
P4:D(T!=0)
P4:D(T<=0)
P4:D(T>=1)
```

| Form | Meaning |
| --- | --- |
| T | At least one T |
| T=1 | Exactly one T |
| T=0 / !T | No T |
| T!=1 | Not exactly one T |
| T<2 / T<=2 / T>2 / T>=2 | Comparison of the number of T occurrences |

= tests equality, never assignment. Counts are integers from 0 to 256 for one kind. TS=1 is not a group total and is rejected; T[2]=1 is also rejected because an occurrence is not a kind count. One standard 7-bag has no repeated kind; counts are also useful across bags and in custom multisets.

### IN: inspect positions without resampling

```text
P7:D(IN(1,3,T))
P7:D(IN(2,5,I<T&T))
P7:D(IN(1,3,T)&IN(4,7,I))
```

IN(start,end,condition) uses inclusive one-based bounds. IN(2,2,T) tests position two. It does not change supply length, bags or correlations. Resampling P7:D(IN(1,3,T)) as P3:D(T)P4 produces a different set.

Bounds must fit the current scope. Zero, reversed bounds or positions beyond a known length produce INVALID_FILTER_WINDOW; no silent clipping. Nested IN bounds are relative to their immediate window, and absence is local to that window.

> F2 windows are D-only. IN in U returns UNSUPPORTED_USE_SELECTOR. Do not pass a still-open supply/observation as a closed window.

### kind[n]: occurrence, not token identity

```text
{P7P7}:D(I[2]<T[2])
{P7P7}:D(I[2]<T[2],T[2])
{P7P7}:D(IN(5,12,T[2]<I))
```

kind[n] selects the nth occurrence inside the current inspection scope (n=1..256). I equals I[1]; repeated II remains a kind group, not I[2]. Inside IN, count again from that window.

| Condition | State | Result |
| --- | --- | --- |
| I[2]<T[2] | Only second I exists | true |
| I[2]<T[2] | No second I | false |
| I[2]<T[2],T[2] | No second T | false |

The ordinal is not a global token-origin or hold ID. U rejects n>1 selectors; n=1 remains ordinary first-occurrence semantics.

### Unsupported spellings and outcomes

| Rejected spelling | Use instead |
| --- | --- |
| T&&I / T\|\|I | T&I / T\|I |
| T==1 | T=1 |
| !I<T | !(I<T) |
| HAS(T) / D?(I<T) | T / D(I<T) |
| P4::D(T) / [=P4]:D(T) | P4:D(T) / {P4}:D(T) |
| TS=1 | Write per-kind counts explicitly |

Distinguish invalid syntax, unsupported features, proven UNSAT, NOT_CHECKED and budget-limited INCOMPLETE. One impossible OR branch must not delete surviving branches; NOT and different windows must not leak into one positive cycle graph.

## Advanced declarations

Preserve supply, environment and F1/F2 conditions in declarative calls, using the same relation model as compact syntax.

### Document structure

```text
tessembly "tessembly.rfc3.order.v1";
config {
    rule = seven_bag();
    start = boundary();
    see = view(next=5);
    hold = slot(initial=empty);
}
supply("P7");
draw(IN(1,3,T)&I<T,T);
use(I<T|!T);
```

Declare config, supply, draw and use at most once each. Duplicate keys or named arguments are rejected even if their values agree. Declaration order never overrides the environment. reference and select may repeat with different identifiers.

Statements end with semicolons. The grammar supports // comments, UTF-8 strings, booleans, unsigned integers, lists, positional and named arguments. A positional argument cannot follow a named argument. There are no arbitrary scripts, loops, function execution or network calls.

### Supply functions

| Function | Declared data |
| --- | --- |
| pattern("P4") or "P4" | Compact supply AST |
| queue("IOT") | Exact finite queue |
| shuffle("TTI") | Distinct multiset permutations |
| bag("IOTSZJL") | Refilling bag stream |
| pool("IT") | Sampling-with-replacement stream |
| take(10, bag("IOTSZJL")) | Finite prefix of ten draws |
| repeat(3, shuffle("SZ")) | Three independent copies of a finite expression |
| concat(queue("IT"), shuffle("SZ")) | Concatenation |
| either(queue("IT"), queue("TI")) | Equal-length alternatives |
| external("vendor.rule", revision="v1", length=10) | Versioned external policy reference |

take cannot request more than a finite source contains. repeat requires a finite source. Concatenating anything after an unbounded stream is rejected. Parsing validates these length contracts without expanding permutations or drawing pieces.

Compact strings refer to standard kinds. Use lists for multi-character custom IDs. A source that cannot project to the standard relation tools remains SOURCE_REQUIRES_HOST, rather than being replaced with a guessed standard queue.

### One condition model, explicit calls

| Compact condition | Advanced form |
| --- | --- |
| T | present("T") |
| I<T | before("I","T") |
| T[2] | present(nth("T",2)) |
| I[2]<T | before(nth("I",2),"T") |
| T=2 | count("T","=",2) |
| I&T / I\|T | all(present("I"),present("T")) / any(present("I"),present("T")) |
| !T | not(present("T")) |
| IN(1,3,T) | within(1,3,present("T")) |

```text
tessembly "tessembly.rfc3.order.v1";
config { registry=["PENTO_P"]; rule=from_source; }
supply(take(8, bag(["I","PENTO_P","PENTO_P"])));
draw(all(count("PENTO_P",">=",2),before(nth("PENTO_P",2),"I")));
```

draw/use accept standard-kind conditions directly or the explicit forms above. Formatting uses all/any/not/count/within/nth/before/present. before(A,B) always means A first. Argument counts/types and registered IDs are validated; these calls are data, not executable functions.

> Register custom IDs and quote them. This example is a custom bag, not standard 7-bag. Comparator migration must not rewrite symbols inside unrelated string values.

### A single environment authority

A fragment with missing settings can be read and stored. Before execution, resolve rule, start, see and hold once with the host. with_host_config fills missing keys only; conflicting values yield CONFIG_CONFLICT. There is no last-value-wins behavior.

The uniform policy in rule=seven_bag() is fixed. from_source means the supply declaration describes its policy. Declare custom host settings through external("id",revision="..."). The identifier never triggers an automatic code download.

### Compatibility boundary of existing references

> Basic reference/select records remain readable for existing-file compatibility; new supply inputs do not need them. No Q1/M1/MATCH or QB/OQB-specific search syntax has been added or recommended.

reference stores an ID, format/value and optional page/revision. select preserves existing reference IDs and ordered at values. Reading these records does not fetch resources or perform setup/policy search. Keep setup goals, metrics and dataset logic in a consumer-owned envelope around supply data.

## Commands and migration

```sh
tessembly --lang en help
tessembly check --profile rfc3 input.tsm
tessembly format --profile rfc3 input.tsm
tessembly encode --profile rfc3 input.tsm new.tsmb
tessembly decode input.tsmb new.tsm
tessembly doc-check input.tsmd
tessembly doc-format input.tsmd
tessembly doc-encode input.tsmd new.tsdc
tessembly doc-decode input.tsdc new.tsmd
tessembly migrate-rfc2 old.tsm new.tsm
tessembly doc-migrate-rfc2 old.tsmd new.tsmd
tessembly migrate-binary-rfc2 old.tsmb new.tsmb
tessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc
```

Output files must be new files. Language changes presentation, not codes or stored meaning. A repository build is not npm publication.

# Experimental AST wire v1

Not a final stable interchange promise. Standard-piece AST only; environment, hold state,
custom piece registries, and mandatory extension execution are not implemented here.

Header: ASCII `TSMB`, byte 1 (wire), byte 3 (RFC3 semantics), canonical unsigned LEB128 body
length. Integers are unsigned. Redundant LEB128 high zero groups and overflows are rejected.
Body: root node followed by extension count and extension TLVs. No trailing data is allowed.
Max body 1 MiB, max extensions 64. Text is not re-parsed to decode this format.

Node tags:

| First byte | Contents before common suffix |
|---|---|
| `(piece_id << 4)`, low nibble zero | literal; IDs I/O/T/S/Z/J/L = 0..6 |
| 1 | byte mask (7 bits), byte take count |
| 2 | ULEB child count, concat children |
| 3 | ULEB child count, union children |
| 4 | scope child |

Common suffix: ULEB source span start/end, flags byte (bit0 D, bit1 U; other bits invalid),
then flagged D/U blocks in that order. Block = ULEB predicate count then predicates.
Predicate tag0: presence, byte piece ID. Tag1: Before, byte `earlier | (later << 3)` with top
bits zero. Tag2: ULEB byte length followed by TSFL v1 filter bytes.
Each predicate ends with ULEB source span start/end. Self comparisons are retained.

TLV: ULEB u32 ID, flags byte 0 optional / 1 critical, ULEB byte length, opaque bytes.
IDs cannot repeat. This draft understands no mandatory extension, so critical always returns
UNSUPPORTED_CRITICAL_EXTENSION. Optional opaque bytes are preserved, not declared interpreted
or verified. Unsupported wire/semantic versions are rejected rather than guessed.

Scopes, predicates, and source spans round-trip structurally. Packed literal IDs and relation
pairs do not bind to CTK3 palette values. Permutations are stored as pools, never enumerated.
No cross-language structure-memory copying or unsafe pointer decoding is used.

RFC2 byte 2 is accepted only by explicit migrate-rfc2 operations. Before/Present payload direction is never flipped. See [migration](COMPARATOR_MIGRATION.md).


## Mandatory F1/F2 filter payload

TSFL + byte 1 contains one structural filter. Tags: 0=Present(selector),
1=Before(earlier,later), 2=Count(ID,operator-byte,count), 3=All(children), 4=Any(children),
5=Not(child), 6=In(start,end,child). Selectors store UTF-8 ID plus one-based ordinal.
Lengths/counts use canonical ULEB; count operators 0..5 are =, !=, <, <=, >, >=.
Child lists are nonempty/bounded, windows are inclusive/one-based. Unknown required tags fail.
TSDC shares the payload for named IDs. Wire=1 and semantic=3 remain; old readers must reject
new tags, never drop filters. Current npm/Wasm assets require ABI=3.

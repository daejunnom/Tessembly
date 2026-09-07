//! Mandatory relation tag 2 carries this structural extension, never executable text.
use tessembly_core::{
    budget::ModelBudget, CountOp, Error, Filter, Occurrence, Piece, Result, MAX_DEPTH, MAX_INPUT,
    MAX_PREDICATES,
};
const LIMIT: usize = 1_048_576;
fn var(out: &mut Vec<u8>, mut n: usize) {
    loop {
        let b = (n & 127) as u8;
        n >>= 7;
        out.push(b | if n == 0 { 0 } else { 128 });
        if n == 0 {
            break;
        }
    }
}
fn name(out: &mut Vec<u8>, s: &str) {
    var(out, s.len());
    out.extend_from_slice(s.as_bytes());
}
fn selector(out: &mut Vec<u8>, s: &Occurrence<String>) {
    name(out, &s.piece);
    var(out, usize::from(s.nth));
}
fn write(out: &mut Vec<u8>, f: &Filter<String>) {
    match f {
        Filter::Present(a) => {
            out.push(0);
            selector(out, a);
        }
        Filter::Before(a, b) => {
            out.push(1);
            selector(out, a);
            selector(out, b);
        }
        Filter::Count(k, op, n) => {
            out.push(2);
            name(out, k);
            out.push(*op as u8);
            var(out, usize::from(*n));
        }
        Filter::All(xs) | Filter::Any(xs) => {
            out.push(if matches!(f, Filter::All(_)) { 3 } else { 4 });
            var(out, xs.len());
            for x in xs {
                write(out, x);
            }
        }
        Filter::Not(x) => {
            out.push(5);
            write(out, x);
        }
        Filter::In {
            start,
            end,
            condition,
        } => {
            out.push(6);
            var(out, usize::from(*start));
            var(out, usize::from(*end));
            write(out, condition);
        }
    }
}
pub fn encode_named(f: &Filter<String>) -> Result<Vec<u8>> {
    f.validate_with(&mut ModelBudget::default(), None, true, &mut |s, b| {
        b.text(s.len())
    })?;
    let mut out = b"TSFL\x01".to_vec();
    write(&mut out, f);
    if out.len() > LIMIT {
        return Err(Error::new("BINARY_LIMIT"));
    }
    Ok(out)
}
pub(crate) fn encode_pieces(f: &Filter<Piece>) -> Result<Vec<u8>> {
    f.validate_with(&mut ModelBudget::default(), None, true, &mut |_, _| Ok(()))?;
    encode_named(&f.try_map(&mut |p| Ok(p.to_string()))?)
}
struct Reader<'a, 'b> {
    bytes: &'a [u8],
    at: usize,
    budget: &'b mut ModelBudget,
}
impl Reader<'_, '_> {
    fn byte(&mut self) -> Result<u8> {
        let b = *self
            .bytes
            .get(self.at)
            .ok_or_else(|| Error::new("TRUNCATED_BINARY"))?;
        self.at += 1;
        Ok(b)
    }
    fn var(&mut self) -> Result<usize> {
        let mut n = 0u64;
        for i in 0..10 {
            let b = self.byte()?;
            if i == 9 && b > 1 {
                return Err(Error::new("VARINT_OVERFLOW"));
            }
            n |= u64::from(b & 127) << (i * 7);
            if b & 128 == 0 {
                if i > 0 && b == 0 {
                    return Err(Error::new("NONCANONICAL_VARINT"));
                }
                return usize::try_from(n).map_err(|_| Error::new("VARINT_OVERFLOW"));
            }
        }
        Err(Error::new("VARINT_OVERFLOW"))
    }
    fn number(&mut self) -> Result<u16> {
        u16::try_from(self.var()?).map_err(|_| Error::new("COUNT_OVERFLOW"))
    }
    fn string(&mut self) -> Result<String> {
        let n = self.var()?;
        if n > MAX_INPUT {
            return Err(Error::new("INPUT_LIMIT"));
        }
        self.budget.text(n)?;
        let end = self
            .at
            .checked_add(n)
            .ok_or_else(|| Error::new("BINARY_LIMIT"))?;
        let b = self
            .bytes
            .get(self.at..end)
            .ok_or_else(|| Error::new("TRUNCATED_BINARY"))?;
        self.at = end;
        String::from_utf8(b.to_vec()).map_err(|_| Error::new("INVALID_UTF8"))
    }
    fn selector(&mut self) -> Result<Occurrence<String>> {
        Ok(Occurrence {
            piece: self.string()?,
            nth: self.number()?,
        })
    }
    fn read(&mut self, d: usize) -> Result<Filter<String>> {
        if d > MAX_DEPTH {
            return Err(Error::new("FILTER_DEPTH_LIMIT"));
        }
        self.budget.predicates(1)?;
        Ok(match self.byte()? {
            0 => Filter::Present(self.selector()?),
            1 => Filter::Before(self.selector()?, self.selector()?),
            2 => Filter::Count(
                self.string()?,
                CountOp::from_id(self.byte()?)?,
                self.number()?,
            ),
            tag @ (3 | 4) => {
                let count = self.var()?;
                if count == 0 || count > MAX_PREDICATES {
                    return Err(Error::new("PREDICATE_LIMIT"));
                }
                let mut xs = Vec::new();
                for _ in 0..count {
                    xs.push(self.read(d + 1)?);
                }
                if tag == 3 {
                    Filter::All(xs)
                } else {
                    Filter::Any(xs)
                }
            }
            5 => Filter::Not(Box::new(self.read(d + 1)?)),
            6 => Filter::In {
                start: self.number()?,
                end: self.number()?,
                condition: Box::new(self.read(d + 1)?),
            },
            _ => return Err(Error::new("UNSUPPORTED_FILTER_TAG")),
        })
    }
}
pub fn decode_named(bytes: &[u8], budget: &mut ModelBudget) -> Result<Filter<String>> {
    if bytes.len() > LIMIT {
        return Err(Error::new("BINARY_LIMIT"));
    }
    if bytes.get(..5) != Some(b"TSFL\x01") {
        return Err(Error::new("UNSUPPORTED_FILTER_WIRE"));
    }
    let mut r = Reader {
        bytes,
        at: 5,
        budget,
    };
    let f = r.read(0)?;
    if r.at != bytes.len() {
        return Err(Error::new("TRAILING_BINARY"));
    }
    f.validate_with(&mut ModelBudget::default(), None, true, &mut |s, b| {
        b.text(s.len())
    })?;
    Ok(f)
}
pub(crate) fn decode_pieces(bytes: &[u8], budget: &mut ModelBudget) -> Result<Filter<Piece>> {
    decode_named(bytes, budget)?.try_map(&mut |s| {
        if s.len() != 1 || !b"IOTSZJL".contains(&s.as_bytes()[0]) {
            return Err(Error::new("INVALID_PIECE_ID"));
        }
        Piece::from_ascii(s.as_bytes()[0])
    })
}

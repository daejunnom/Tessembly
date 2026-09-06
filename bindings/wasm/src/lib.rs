//! Dependency-free JS/Wasm bridge. No WASI, wasm-bindgen, network, raw-pointer reads,
//! or foreign allocation ownership. JavaScript writes only into the reserved input Vec.
use std::cell::RefCell;
use tessembly_core::{Error, Result, PROFILE};
const LIMIT: usize = 1_100_000;
#[derive(Default)]
struct Buffers {
    input: Vec<u8>,
    output: Vec<u8>,
    error: Option<Error>,
}
thread_local! { static BUFFERS: RefCell<Buffers> = RefCell::new(Buffers::default()); }

fn dispatch(op: u32, input: &[u8]) -> Result<Vec<u8>> {
    if matches!(op, 4 | 8) {
        return if op == 4 {
            let doc = tessembly_codec::decode(input)?;
            if !doc.optional_extensions.is_empty() {
                return Err(Error::new("OPAQUE_METADATA_WOULD_BE_LOST"));
            }
            Ok(tessembly_text::format(&doc.root)?.into_bytes())
        } else {
            Ok(tessembly_document::wire::decode(input)?.to_text()?.into_bytes())
        };
    }
    let text = std::str::from_utf8(input).map_err(|_| Error::new("INVALID_UTF8"))?;
    if (1..=3).contains(&op) {
        let root = tessembly_text::parse(text, PROFILE)?;
        return match op {
            1 => Ok(tessembly_text::format(&root)?.into_bytes()),
            2 => {
                let a = tessembly_relations::analyze(&root);
                let mut out = vec![u8::from(a.draw_unsat), u8::from(a.execution_unsat)];
                out.extend_from_slice(tessembly_text::format(&root)?.as_bytes());
                Ok(out)
            }
            3 => tessembly_codec::encode(&tessembly_codec::Document { root, optional_extensions: vec![] }),
            _ => unreachable!(),
        };
    }
    if (5..=7).contains(&op) {
        let doc = tessembly_document::parse(text)?;
        return match op {
            5 => Ok(doc.to_text()?.into_bytes()),
            6 => {
                let mut out = vec![0, 0];
                if let Ok(root) = doc.standard_pattern() {
                    let a = tessembly_relations::analyze(&root);
                    out[0] = u8::from(a.draw_unsat);
                    out[1] = u8::from(a.execution_unsat);
                }
                out.extend_from_slice(doc.to_text()?.as_bytes());
                Ok(out)
            }
            7 => tessembly_document::wire::encode(&doc),
            _ => unreachable!(),
        };
    }
    Err(Error::new("UNSUPPORTED_OPERATION"))
}

// no_mangle fixes the ABI names. These exports use integer offsets, not unsafe
// Rust pointer dereferences. The library has no unsafe blocks.
#[no_mangle]
pub extern "C" fn ts_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn ts_reserve_input(len: u32) -> u32 {
    BUFFERS.with(|cell| {
        let mut b = cell.borrow_mut();
        b.error = None;
        b.output.clear();
        if len as usize > LIMIT {
            let e = Error::new("INPUT_LIMIT");
            b.output.extend_from_slice(e.code.as_bytes());
            b.error = Some(e);
            b.input.clear();
            return 0;
        }
        b.input.resize(len as usize, 0);
        b.input.as_mut_ptr() as usize as u32
    })
}
#[no_mangle]
pub extern "C" fn ts_run(op: u32) -> u32 {
    BUFFERS.with(|cell| {
        let mut b = cell.borrow_mut();
        b.error = None;
        match dispatch(op, &b.input) {
            Ok(out) => { b.output = out; 0 }
            Err(e) => { b.output = e.code.as_bytes().to_vec(); b.error = Some(e); 1 }
        }
    })
}
#[no_mangle]
pub extern "C" fn ts_output_ptr() -> u32 {
    BUFFERS.with(|b| b.borrow().output.as_ptr() as usize as u32)
}
#[no_mangle]
pub extern "C" fn ts_output_len() -> u32 { BUFFERS.with(|b| b.borrow().output.len() as u32) }
#[no_mangle]
pub extern "C" fn ts_error_start() -> u32 { BUFFERS.with(|b| b.borrow().error.as_ref().map_or(0, |e| e.span.start as u32)) }
#[no_mangle]
pub extern "C" fn ts_error_end() -> u32 { BUFFERS.with(|b| b.borrow().error.as_ref().map_or(0, |e| e.span.end as u32)) }
#[no_mangle]
pub extern "C" fn ts_reset() {
    BUFFERS.with(|b| *b.borrow_mut() = Buffers::default());
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn codec_and_semantic_domains() {
        let bytes = dispatch(3, b"P4:D(I<TS)").unwrap();
        assert!(!dispatch(4, &bytes).unwrap().is_empty());
        let report = dispatch(2, b"P7:D(I<T<I)").unwrap();
        assert_eq!(&report[..2], &[1, 1]);
        let usage = dispatch(2, b"P7:U(I<T<I)").unwrap();
        assert_eq!(&usage[..2], &[0, 1]);
    }
    #[test]
    fn document_roundtrip_and_errors() {
        let source = b"tessembly \"tessembly.rfc2.precedence.v1\"; supply(\"P4\"); draw(I<TS);";
        let bytes = dispatch(7, source).unwrap();
        assert_eq!(dispatch(8, &bytes).unwrap(), dispatch(5, source).unwrap());
        assert!(dispatch(1, b"P4:D(HAS(T))").is_err());
        assert!(dispatch(1, &[255]).is_err());
    }
}

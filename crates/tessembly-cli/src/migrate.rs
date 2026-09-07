//! Explicit RFC2 migration. Never guesses the profile of an unlabelled file.
use tessembly_core::{Error, Result};
pub fn run(command: &str, args: Vec<String>) -> Result<u8> {
    if args.len() != 2 {
        return Err(Error::new("INVALID_ARGUMENTS"));
    }
    let binary = matches!(command, "migrate-binary-rfc2" | "doc-migrate-binary-rfc2");
    if !matches!(
        command,
        "migrate-rfc2" | "doc-migrate-rfc2" | "migrate-binary-rfc2" | "doc-migrate-binary-rfc2"
    ) {
        return Err(Error::new("INVALID_ARGUMENTS"));
    }
    let input = crate::read_file(
        &args[0],
        if binary {
            1_048_592
        } else {
            tessembly_core::MAX_INPUT
        },
    )?;
    let output = if binary {
        if command.starts_with("doc-") {
            tessembly_document::wire::migrate_rfc2(&input)?
        } else {
            tessembly_codec::migrate_rfc2(&input)?
        }
    } else {
        let text = std::str::from_utf8(&input).map_err(|_| Error::new("INVALID_UTF8"))?;
        if command.starts_with("doc-") {
            tessembly_document::migrate_rfc2(text)?.into_bytes()
        } else {
            tessembly_text::migrate_rfc2(text)?.into_bytes()
        }
    };
    crate::write_new(&args[1], output)?;
    Ok(0)
}

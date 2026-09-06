#![forbid(unsafe_code)]
mod advanced;
mod expand;
mod port;
use std::{env, fs, io::{self, BufRead, Read, Write}, process::ExitCode};
use serde_json::json;
use tessembly_core::{Error, Result, PROFILE, PROTOCOL};

const HELP: &str = include_str!("../../../docs/HELP.ko.md");
fn read_file(path: &str, limit: usize) -> Result<Vec<u8>> {
    let f = fs::File::open(path).map_err(|_| Error::new("READ_FAILED"))?;
    let mut bytes = Vec::new();
    f.take(limit as u64 + 1).read_to_end(&mut bytes).map_err(|_|Error::new("READ_FAILED"))?;
    if bytes.len() > limit { return Err(Error::new("INPUT_LIMIT")); } Ok(bytes)
}
fn test_port() -> Result<()> {
    let stdin = io::stdin(); let mut input = stdin.lock();
    let stdout = io::stdout(); let mut output = stdout.lock();
    loop {
        let mut line = Vec::new();
        let limit = 4 * 1024 * 1024;
        let n = (&mut input).take(limit + 1).read_until(b'\n', &mut line).map_err(|_|Error::new("READ_FAILED"))?;
        if n == 0 { break; }
        if n as u64 > limit { return Err(Error::new("REQUEST_LIMIT")); }
        let response = match serde_json::from_slice(&line) {
            Ok(req) => port::response(&req),
            Err(_) => json!({"protocol":PROTOCOL,"profile":PROFILE,"id":null,"status":"INVALID_REQUEST","complete":false,"error":{"code":"INVALID_JSON"}}),
        };
        serde_json::to_writer(&mut output, &response).map_err(|_|Error::new("WRITE_FAILED"))?;
        output.write_all(b"\n").and_then(|_|output.flush()).map_err(|_|Error::new("WRITE_FAILED"))?;
    }
    Ok(())
}
fn run() -> Result<u8> {
    let mut args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || matches!(args[0].as_str(), "help" | "--help" | "-h") { println!("{HELP}"); return Ok(0); }
    let command = args.remove(0);
    if command.starts_with("doc-") { return advanced::run(&command,args); }
    if command == "test-port" {
        if !args.is_empty() { return Err(Error::new("INVALID_ARGUMENTS")); }
        test_port()?; return Ok(0);
    }
    if command == "decode" {
        if args.len() != 2 { return Err(Error::new("INVALID_ARGUMENTS")); }
        let doc = tessembly_codec::decode(&read_file(&args[0],1_048_592)?)?;
        fs::write(&args[1],tessembly_text::format(&doc.root)?).map_err(|_|Error::new("WRITE_FAILED"))?;
        eprintln!("Decoded profile: {PROFILE}; optional metadata remains in the binary input.");
        return Ok(0);
    }
    if !matches!(command.as_str(),"lint"|"check"|"format"|"encode") { return Err(Error::new("INVALID_ARGUMENTS")); }
    let mut deny_unsat = false; let mut profile = None; let mut files = Vec::new();
    let mut it = args.into_iter();
    while let Some(arg) = it.next() {
        match arg.as_str() {
            "--profile" => profile = it.next(),
            "--deny-unsat" => deny_unsat = true,
            _ if arg.starts_with('-') => return Err(Error::new("INVALID_ARGUMENTS")),
            _ => files.push(arg),
        }
    }
    let p = profile.as_deref().ok_or_else(||Error::new("PROFILE_REQUIRED"))?;
    if p != "rfc2" && p != PROFILE { return Err(Error::new("UNSUPPORTED_PROFILE")); }
    if files.is_empty() || (command == "encode" && files.len() != 2) { return Err(Error::new("INVALID_ARGUMENTS")); }
    let mut exit = 0;
    let sources = if command == "encode" { &files[..1] } else { &files[..] };
    for path in sources {
        let bytes = read_file(path,tessembly_core::MAX_INPUT)?;
        let text = std::str::from_utf8(&bytes).map_err(|_|Error::new("INVALID_UTF8"))?;
        let root = tessembly_text::parse(text, PROFILE)?;
        match command.as_str() {
            "format" => println!("{}",tessembly_text::format(&root)?),
            "encode" => {
                let doc = tessembly_codec::Document { root, optional_extensions:vec![] };
                fs::write(&files[1],tessembly_codec::encode(&doc)?).map_err(|_|Error::new("WRITE_FAILED"))?;
            }
            _ => {
                let a = tessembly_relations::analyze(&root);
                println!("{}",json!({"path":path,"profile":PROFILE,"syntax":"VALID",
                    "draw":if a.draw_unsat {"UNSAT"} else {"NOT_CHECKED"},
                    "execution":if a.execution_unsat {"UNSAT"} else {"NOT_CHECKED"}}));
                if deny_unsat && a.execution_unsat { exit = 1; }
            }
        }
    }
    Ok(exit)
}
fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code),
        Err(error) => { eprintln!("{error}"); ExitCode::from(2) }
    }
}

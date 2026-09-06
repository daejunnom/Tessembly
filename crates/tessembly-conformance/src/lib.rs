//! Optional external-developer transport. A deadline is not a sandbox or process-tree jail.
#![forbid(unsafe_code)]
use std::{
    io::{Read, Write},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc, Arc,
    },
    thread,
    time::{Duration, Instant},
};
static ACTIVE: AtomicUsize = AtomicUsize::new(0);
struct Permit;
impl Drop for Permit {
    fn drop(&mut self) {
        ACTIVE.fetch_sub(1, Ordering::Relaxed);
    }
}
/// Time-bound stdin, stdout and exit together, without joining an unbounded reader.
pub fn exchange(command: &[String], input: Vec<u8>, timeout: Duration) -> Result<Vec<u8>, String> {
    const MAX_RESPONSE: usize = 8_388_608;
    if command.is_empty() || input.len() > 4_194_304 {
        return Err("INVALID_HOST_REQUEST".into());
    }
    ACTIVE
        .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |n| {
            (n < 4).then_some(n + 1)
        })
        .map_err(|_| "HOST_TRANSPORT_BUSY".to_string())?;
    // A descendant holding inherited pipes keeps a permit; repeated requests cannot create unbounded waiting threads.
    let permit = Arc::new(Permit);
    let start = Instant::now();
    let mut child = Command::new(&command[0])
        .args(&command[1..])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("NO_STDOUT")?;
    let mut stdin = child.stdin.take().ok_or("NO_STDIN")?;
    let (write_tx, write_rx) = mpsc::sync_channel(1);
    let writer_permit = permit.clone();
    thread::spawn(move || {
        let _permit = writer_permit;
        let result = stdin.write_all(&input);
        drop(stdin);
        let _ = write_tx.send(result);
    });
    let (read_tx, read_rx) = mpsc::sync_channel(1);
    let reader_permit = permit.clone();
    thread::spawn(move || {
        let _permit = reader_permit;
        let mut bytes = Vec::new();
        let result = stdout
            .take((MAX_RESPONSE + 1) as u64)
            .read_to_end(&mut bytes)
            .map(|_| bytes);
        let _ = read_tx.send(result);
    });
    let outcome = (|| {
        let mut written = false;
        let mut output = None;
        let mut exit = None;
        loop {
            if !written {
                match write_rx.try_recv() {
                    Ok(r) => {
                        r.map_err(|e| e.to_string())?;
                        written = true;
                    }
                    Err(mpsc::TryRecvError::Empty) => {}
                    Err(_) => return Err("HOST_STDIN_FAILED".into()),
                }
            }
            if output.is_none() {
                match read_rx.try_recv() {
                    Ok(r) => {
                        let bytes = r.map_err(|e| e.to_string())?;
                        if bytes.len() > MAX_RESPONSE {
                            return Err("RESPONSE_LIMIT".into());
                        }
                        output = Some(bytes);
                    }
                    Err(mpsc::TryRecvError::Empty) => {}
                    Err(_) => return Err("HOST_STDOUT_FAILED".into()),
                }
            }
            if exit.is_none() {
                exit = child.try_wait().map_err(|e| e.to_string())?;
            }
            if let Some(status) = exit {
                if !status.success() {
                    return Err(format!("HOST_EXIT:{status}"));
                }
                if written && output.is_some() {
                    return Ok(output.take().unwrap_or_default());
                }
            }
            if start.elapsed() >= timeout {
                return Err("HOST_TIMEOUT".into());
            }
            thread::sleep(Duration::from_millis(5));
        }
    })();
    if outcome.is_err() {
        let _ = child.kill();
        let _ = child.wait();
    }
    outcome
}

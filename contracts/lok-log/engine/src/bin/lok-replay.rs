//! Replay a hash-chained lok log. Stops at the first bad hash.

use std::env;
use std::fs;
use std::process::ExitCode;

use lok_engine::{parse_log, replay, ReplayStop};

fn hex32(bytes: &[u8; 32]) -> String {
    format!("0x{}", hex::encode(bytes))
}

fn main() -> ExitCode {
    let mut args = env::args().skip(1);
    let path = match args.next() {
        Some(p) if p != "-h" && p != "--help" => p,
        _ => {
            eprintln!("usage: lok-replay <log.json>");
            return ExitCode::from(2);
        }
    };
    if args.next().is_some() {
        eprintln!("usage: lok-replay <log.json>");
        return ExitCode::from(2);
    }
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(err) => {
            eprintln!("error: read {path}: {err}");
            return ExitCode::from(2);
        }
    };
    let doc = match parse_log(&text) {
        Ok(doc) => doc,
        Err(err) => {
            eprintln!("error: {err}");
            return ExitCode::from(2);
        }
    };
    match replay(&doc) {
        Ok(report) => {
            println!(
                "ok entries={} head={} state_root={} summary={}",
                report.entries,
                hex32(&report.head),
                hex32(&report.state_root),
                report.summary.to_hex()
            );
            ExitCode::SUCCESS
        }
        Err(ReplayStop::BadHash {
            index,
            expected,
            computed,
        }) => {
            eprintln!("bad hash at index {index}");
            eprintln!("  expected: {}", hex32(&expected));
            eprintln!("  computed: {}", hex32(&computed));
            ExitCode::from(1)
        }
        Err(ReplayStop::Rejected { index, reason }) => {
            eprintln!("rejected at index {index}: {reason}");
            ExitCode::from(2)
        }
    }
}

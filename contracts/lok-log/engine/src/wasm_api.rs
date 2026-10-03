//! C ABI for the game server. One wasm instance is the set of per-character logs.
//! The server persists `lok_document` itself. No chain calls live here.

use crate::gate::Gate;

static mut GATE: Option<Gate> = None;
static mut OUT: Vec<u8> = Vec::new();
static mut INPUT: Vec<u8> = Vec::new();

fn set_out(text: &str) {
    unsafe {
        OUT.clear();
        OUT.extend_from_slice(text.as_bytes());
    }
}

fn read_in(ptr: *const u8, len: usize) -> String {
    if ptr.is_null() || len == 0 {
        return String::new();
    }
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    String::from_utf8_lossy(bytes).into_owned()
}

#[no_mangle]
pub extern "C" fn lok_alloc(len: usize) -> *mut u8 {
    unsafe {
        INPUT.clear();
        INPUT.resize(len, 0);
        INPUT.as_mut_ptr()
    }
}

#[no_mangle]
pub extern "C" fn lok_out_ptr() -> *const u8 {
    unsafe { OUT.as_ptr() }
}

#[no_mangle]
pub extern "C" fn lok_out_len() -> usize {
    unsafe { OUT.len() }
}

/// 0 = opened. Nonzero = refused (bad hash, parse error). Message is in the out buffer.
#[no_mangle]
pub extern "C" fn lok_open(ptr: *const u8, len: usize) -> i32 {
    let text = read_in(ptr, len);
    match Gate::open(&text) {
        Ok(gate) => {
            unsafe { GATE = Some(gate) }
            set_out("ok");
            0
        }
        Err(err) => {
            unsafe { GATE = None }
            set_out(&err);
            1
        }
    }
}

/// Always writes a JSON object to the out buffer. 0 = that JSON was produced.
#[no_mangle]
pub extern "C" fn lok_apply(ptr: *const u8, len: usize) -> i32 {
    let text = read_in(ptr, len);
    let result = unsafe {
        match GATE.as_mut() {
            Some(gate) => gate.apply_command(&text),
            None => "{\"ok\":false,\"error\":\"lok log is not open\"}".to_string(),
        }
    };
    set_out(&result);
    0
}

#[no_mangle]
pub extern "C" fn lok_document() -> i32 {
    let doc = unsafe {
        match GATE.as_ref() {
            Some(gate) => gate.document_json(),
            None => "{\"type\":\"world\",\"entries\":[]}".to_string(),
        }
    };
    set_out(&doc);
    0
}
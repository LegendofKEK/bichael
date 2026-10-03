import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type LokExports = {
  memory: WebAssembly.Memory;
  lok_alloc: (len: number) => number;
  lok_out_ptr: () => number;
  lok_out_len: () => number;
  lok_open: (ptr: number, len: number) => number;
  lok_apply: (ptr: number, len: number) => number;
  lok_document: () => number;
};

const here = dirname(fileURLToPath(import.meta.url));

export function defaultWasmPath(): string {
  return join(here, "../../../contracts/lok-log/engine/pkg/lok_engine.wasm");
}

export function loadLokExports(wasmPath = defaultWasmPath()): LokExports {
  const bytes = readFileSync(wasmPath);
  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, {});
  return instance.exports as unknown as LokExports;
}

export function lokOut(exp: LokExports): string {
  const ptr = exp.lok_out_ptr();
  const len = exp.lok_out_len();
  if (!len) return "";
  return new TextDecoder().decode(new Uint8Array(exp.memory.buffer, ptr, len));
}

export function lokCall(
  exp: LokExports,
  text: string,
  fn: (ptr: number, len: number) => number,
): { rc: number; out: string } {
  const bytes = new TextEncoder().encode(text);
  const ptr = exp.lok_alloc(bytes.length);
  if (bytes.length) {
    new Uint8Array(exp.memory.buffer, ptr, bytes.length).set(bytes);
  }
  const rc = fn(ptr, bytes.length);
  return { rc, out: lokOut(exp) };
}
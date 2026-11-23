import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_STACK = 256;
const MAX_CALLS = 64;
const MAX_STEPS = 1_000_000;
const MAX_OUTPUT = 65_536;
const encoder = new TextEncoder();

function execute(code: Uint8Array, input: Uint8Array): { output: Uint8Array; exit: number } {
  const stack = new Int32Array(MAX_STACK);
  const returns = new Int32Array(MAX_CALLS);
  const memory = new Int32Array(256);
  const output = new Uint8Array(MAX_OUTPUT);
  let sp = 0, cp = 0, pc = 0, ip = 0, written = 0, steps = 0;
  const finish = (exit: number) => ({ output: output.slice(0, written), exit });
  for (;;) {
    if (steps === MAX_STEPS) return finish(10);
    if (pc < 0 || pc >= code.length) return finish(9);
    const op = code[pc];
    let imm = 0, pops = 0, pushes = 0;
    switch (op) {
      case 0x00: break;
      case 0x01: imm = 1; pushes = 1; break;
      case 0x02: imm = 4; pushes = 1; break;
      case 0x03: pops = 1; break;
      case 0x04: pops = 1; pushes = 2; break;
      case 0x05: pops = 2; pushes = 2; break;
      case 0x06: pops = 2; pushes = 3; break;
      case 0x07: pops = 3; pushes = 3; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: pops = 2; pushes = 1; break;
      case 0x17: case 0x1b: case 0x40: case 0x50: case 0x51: case 0x53: pops = 1; pushes = op === 0x40 ? 1 : 0; break;
      case 0x31: case 0x32: imm = 2; pops = 1; break;
      case 0x30: case 0x33: imm = 2; break;
      case 0x34: break;
      case 0x41: pops = 2; break;
      case 0x52: pushes = 1; break;
      default: return finish(5);
    }
    if (pc + imm >= code.length) return finish(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < pops) return finish(2);
    if (sp - pops + pushes > MAX_STACK) return finish(3);
    pc = next;
    if (op === 0x00) return finish(0);
    if (op === 0x01) { stack[sp++] = (code[next - 1] << 24) >> 24; continue; }
    if (op === 0x02) { stack[sp++] = code[next - 4] | code[next - 3] << 8 | code[next - 2] << 16 | code[next - 1] << 24; continue; }
    if (op === 0x03) { sp--; continue; }
    if (op === 0x04) { stack[sp] = stack[sp - 1]; sp++; continue; }
    if (op === 0x05) { const t = stack[sp - 1]; stack[sp - 1] = stack[sp - 2]; stack[sp - 2] = t; continue; }
    if (op === 0x06) { const v = stack[sp - 2]; stack[sp++] = v; continue; }
    if (op === 0x07) { const a = stack[sp - 3]; stack[sp - 3] = stack[sp - 2]; stack[sp - 2] = stack[sp - 1]; stack[sp - 1] = a; continue; }
    if (op === 0x17) { stack[sp - 1] = -stack[sp - 1] | 0; continue; }
    if (op === 0x1b) { stack[sp - 1] = ~stack[sp - 1]; continue; }
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) {
      const b = stack[sp - 1], a = stack[sp - 2];
      let r: number;
      switch (op) {
        case 0x10: r = a + b | 0; break;
        case 0x11: r = a - b | 0; break;
        case 0x12: r = Math.imul(a, b); break;
        case 0x13: if (b === 0) return finish(4); r = a === -2147483648 && b === -1 ? a : a / b | 0; break;
        case 0x14: if (b === 0) return finish(4); r = b === -1 ? 0 : a % b | 0; break;
        case 0x15: if (b === 0) return finish(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
        case 0x16: if (b === 0) return finish(4); r = (a >>> 0) % (b >>> 0) | 0; break;
        case 0x18: r = a & b; break;
        case 0x19: r = a | b; break;
        case 0x1a: r = a ^ b; break;
        case 0x1c: r = a << (b & 31); break;
        case 0x1d: r = a >> (b & 31); break;
        case 0x1e: r = a >>> (b & 31); break;
        case 0x20: r = a === b ? 1 : 0; break;
        case 0x21: r = a < b ? 1 : 0; break;
        default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      }
      sp -= 2; stack[sp++] = r; continue;
    }
    if (op === 0x30 || op === 0x31 || op === 0x32) {
      const rel = (code[next - 2] | code[next - 1] << 8) << 16 >> 16;
      let take = true;
      if (op !== 0x30) { const v = stack[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
      if (take) pc = next + rel;
      continue;
    }
    if (op === 0x33) { if (cp === MAX_CALLS) return finish(7); returns[cp++] = next; pc = code[next - 2] | code[next - 1] << 8; continue; }
    if (op === 0x34) { if (cp === 0) return finish(8); pc = returns[--cp]; continue; }
    if (op === 0x40) { const addr = stack[sp - 1]; if (addr < 0 || addr >= 256) return finish(6); stack[sp - 1] = memory[addr]; continue; }
    if (op === 0x41) { const addr = stack[sp - 1], value = stack[sp - 2]; if (addr < 0 || addr >= 256) return finish(6); sp -= 2; memory[addr] = value; continue; }
    if (op === 0x50) {
      const bytes = encoder.encode(String(stack[sp - 1]));
      if (written + bytes.length > MAX_OUTPUT) return finish(11);
      sp--; output.set(bytes, written); written += bytes.length; continue;
    }
    if (op === 0x51) { if (written === MAX_OUTPUT) return finish(11); output[written++] = stack[--sp] & 255; continue; }
    if (op === 0x52) { stack[sp++] = ip < input.length ? input[ip++] : -1; continue; }
    if (op === 0x53) return finish(stack[--sp] & 255);
  }
}

for (const id of readdirSync(INPUT_DIR).sort()) {
  const dir = join(INPUT_DIR, id);
  const result = execute(readFileSync(join(dir, 'program.bin')), readFileSync(join(dir, 'input.bin')));
  const target = join(OUTPUT_DIR, id);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'stdout.bin'), result.output);
  writeFileSync(join(target, 'exit.txt'), `${result.exit}\n`);
}

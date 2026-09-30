// Byte-accurate, checked memory for the interpreter. Every access is validated
// (like AddressSanitizer): NULL, out-of-bounds, use-after-free, stack-use-after-
// return, writes to read-only data. Per-byte "initialized" flags detect reads of
// indeterminate values.

export const NULL_GUARD = 0x1000;
export const TEXT_BASE = 0x401000;
export const STACK_TOP = 0x7ffeeffff000;
export const STACK_SIZE = 1 << 20;
export const STACK_BASE = STACK_TOP - STACK_SIZE;
export const HEAP_BASE = 0x5555555592a0;
export const HEAP_LIMIT = 16 * 1024 * 1024;
export const HEAP_REDZONE = 16;

export class CRuntimeError extends Error {
  constructor(
    readonly kind: string,
    message: string,
    readonly addr?: number
  ) {
    super(message);
  }
}

export interface MemObject {
  addr: number;
  size: number;
  name: string;
}

export interface HeapBlock {
  id: number;
  addr: number;
  size: number;
  data: Uint8Array;
  init: Uint8Array;
  freed: boolean;
  line: number;
  fn: string;
  freedLine?: number;
}

/** Stack frame footprint used for access checks. */
export interface FrameArea {
  /** Lowest address owned by the frame (grows with VLAs). */
  lo: number;
  /** One past the highest address (frame pointer + 16 + variadic area). */
  hi: number;
  /** Objects inside the frame, sorted by address. */
  objects: MemObject[];
  name: string;
}

export interface Resolved {
  data: Uint8Array;
  init: Uint8Array;
  off: number;
}

export interface WriteHook {
  (addr: number, oldBytes: Uint8Array, oldInit: Uint8Array | null, newBytes: Uint8Array): void;
}

function hex(n: number): string {
  return '0x' + n.toString(16);
}

class Region {
  data: Uint8Array;
  init: Uint8Array;
  constructor(readonly base: number, readonly size: number, readonly name: string, readonly readonly_: boolean) {
    this.data = new Uint8Array(size);
    this.init = new Uint8Array(size);
  }
  contains(addr: number, size: number): boolean {
    return addr >= this.base && addr + size <= this.base + this.size;
  }
}

export class Memory {
  rodata: Region;
  data: Region;
  stack: Region;
  /** Globals with red zones between them, sorted by address. */
  globalObjects: MemObject[] = [];
  heap: HeapBlock[] = [];
  heapLive = 0;
  private heapNext = HEAP_BASE;
  private blockCounter = 1;
  /** Frame areas, outermost first (addresses descending). */
  frames: FrameArea[] = [];
  /** Current stack pointer (lowest live stack address). */
  sp = STACK_TOP;
  onWrite: WriteHook | null = null;
  textEnd = TEXT_BASE;
  scratch = new DataView(new ArrayBuffer(8));

  constructor(rodataSize: number, rodataBase: number, dataSize: number, dataBase: number) {
    this.rodata = new Region(rodataBase, Math.max(rodataSize, 1), 'rodata', true);
    this.data = new Region(dataBase, Math.max(dataSize, 1), 'data', false);
    this.stack = new Region(STACK_BASE, STACK_SIZE, 'stack', false);
  }

  // ------------------------------------------------------------------ lookup

  private heapBlockAt(addr: number): HeapBlock | null {
    const h = this.heap;
    let lo = 0;
    let hi = h.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const b = h[mid];
      if (addr < b.addr) hi = mid - 1;
      else if (addr >= b.addr + Math.max(b.size, 1) + HEAP_REDZONE) lo = mid + 1;
      else return b;
    }
    return null;
  }

  /** Block whose payload starts exactly at addr (for free/realloc). */
  heapBlockStartingAt(addr: number): HeapBlock | null {
    const b = this.heapBlockAt(addr);
    return b && b.addr === addr ? b : null;
  }

  findObject(objects: MemObject[], addr: number): MemObject | null {
    let lo = 0;
    let hi = objects.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const o = objects[mid];
      if (addr < o.addr) hi = mid - 1;
      else if (addr >= o.addr + Math.max(o.size, 1)) lo = mid + 1;
      else return o;
    }
    return null;
  }

  /** Validate an access and return where its bytes live. */
  resolve(addr: number, size: number, write: boolean): Resolved {
    if (!Number.isFinite(addr)) throw new CRuntimeError('SEGV', `invalid pointer value`);
    if (addr < NULL_GUARD) {
      throw new CRuntimeError(
        'null-deref',
        `${write ? 'write to' : 'read from'} NULL pointer${addr ? ` (address ${hex(addr)})` : ''}`,
        addr
      );
    }
    // Stack (most common).
    if (addr >= STACK_BASE && addr < STACK_TOP) {
      if (addr + size > STACK_TOP) throw new CRuntimeError('stack-buffer-overflow', `access past the top of the stack`, addr);
      if (addr < this.sp) {
        throw new CRuntimeError(
          'stack-use-after-return',
          `${write ? 'write to' : 'read from'} stack memory at ${hex(addr)} that is no longer in use (a local variable of a function that already returned?)`,
          addr
        );
      }
      const frame = this.frameAt(addr);
      if (frame) {
        const obj = this.findObject(frame.objects, addr);
        if (!obj || addr + size > obj.addr + obj.size) {
          const near = obj ?? nearestObject(frame.objects, addr);
          throw new CRuntimeError(
            'stack-buffer-overflow',
            `${write ? 'write' : 'read'} of size ${size} at ${hex(addr)} is outside ${near ? describeOverflow(near, addr) : 'any variable'} in ${frame.name}()`,
            addr
          );
        }
      }
      const off = addr - STACK_BASE;
      return { data: this.stack.data, init: this.stack.init, off };
    }
    // Heap.
    if (addr >= HEAP_BASE && addr < this.heapNext) {
      const b = this.heapBlockAt(addr);
      if (!b) {
        throw new CRuntimeError('wild-pointer', `${write ? 'write to' : 'read from'} ${hex(addr)}, which is not inside any allocated heap block`, addr);
      }
      if (b.freed) {
        throw new CRuntimeError(
          'heap-use-after-free',
          `${write ? 'write' : 'read'} of size ${size} at ${hex(addr)} inside a ${b.size}-byte block that was already freed${b.freedLine ? ` at line ${b.freedLine}` : ''} (allocated at line ${b.line})`,
          addr
        );
      }
      const off = addr - b.addr;
      if (off + size > b.size) {
        const past = off + size - b.size;
        throw new CRuntimeError(
          'heap-buffer-overflow',
          `${write ? 'write' : 'read'} of size ${size} at ${hex(addr)} is ${off >= b.size ? `${off - b.size} bytes past the end of` : `${past} byte${past === 1 ? '' : 's'} beyond`} a ${b.size}-byte block allocated at line ${b.line}`,
          addr
        );
      }
      return { data: b.data, init: b.init, off };
    }
    if (this.data.contains(addr, 1)) {
      const obj = this.findObject(this.globalObjects, addr);
      if (!obj || addr + size > obj.addr + obj.size) {
        const near = obj ?? nearestObject(this.globalObjects, addr);
        throw new CRuntimeError(
          'global-buffer-overflow',
          `${write ? 'write' : 'read'} of size ${size} at ${hex(addr)} is outside ${near ? describeOverflow(near, addr) : 'any global variable'}`,
          addr
        );
      }
      return { data: this.data.data, init: this.data.init, off: addr - this.data.base };
    }
    if (this.rodata.contains(addr, 1)) {
      if (write) {
        throw new CRuntimeError('write-to-readonly', `write to read-only memory at ${hex(addr)} (string literals cannot be modified; copy it into a char array first)`, addr);
      }
      if (!this.rodata.contains(addr, size)) throw new CRuntimeError('global-buffer-overflow', `read past the end of read-only data at ${hex(addr)}`, addr);
      return { data: this.rodata.data, init: this.rodata.init, off: addr - this.rodata.base };
    }
    if (addr >= TEXT_BASE && addr < this.textEnd) {
      throw new CRuntimeError('SEGV', `${write ? 'write to' : 'read from'} function code at ${hex(addr)}`, addr);
    }
    throw new CRuntimeError('SEGV', `segmentation fault: invalid address ${hex(addr)}`, addr);
  }

  private frameAt(addr: number): FrameArea | null {
    const fs = this.frames;
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i];
      if (addr >= f.lo && addr < f.hi) return f;
    }
    return null;
  }

  // ------------------------------------------------------------------ raw access

  /** Read bytes (checked). Returns a view; copy before mutating memory. */
  read(addr: number, size: number): { bytes: Uint8Array; initOk: boolean } {
    const r = this.resolve(addr, size, false);
    let initOk = true;
    for (let i = 0; i < size; i++) {
      if (!r.init[r.off + i]) {
        initOk = false;
        break;
      }
    }
    return { bytes: r.data.subarray(r.off, r.off + size), initOk };
  }

  write(addr: number, bytes: Uint8Array): void {
    const size = bytes.length;
    if (size === 0) return;
    const r = this.resolve(addr, size, true);
    if (this.onWrite) {
      const old = r.data.slice(r.off, r.off + size);
      let allInit = true;
      for (let i = 0; i < size; i++) {
        if (!r.init[r.off + i]) {
          allInit = false;
          break;
        }
      }
      const oldInit = allInit ? null : r.init.slice(r.off, r.off + size);
      this.onWrite(addr, old, oldInit, bytes.slice());
    }
    r.data.set(bytes, r.off);
    r.init.fill(1, r.off, r.off + size);
  }

  /** Copy with memmove semantics, preserving initialization flags. */
  copy(dst: number, src: number, size: number): void {
    if (size <= 0) return;
    const s = this.resolve(src, size, false);
    const bytes = s.data.slice(s.off, s.off + size);
    const init = s.init.slice(s.off, s.off + size);
    this.write(dst, bytes);
    // Propagate indeterminate bytes (e.g. struct padding) without warnings.
    let anyUninit = false;
    for (let i = 0; i < size; i++) if (!init[i]) anyUninit = true;
    if (anyUninit) {
      const d = this.resolve(dst, size, true);
      for (let i = 0; i < size; i++) if (!init[i]) d.init[d.off + i] = 0;
    }
  }

  /** Mark bytes as indeterminate. Returns the previous flags (for undo). */
  markUninit(addr: number, size: number): Uint8Array | null {
    if (size <= 0) return null;
    const r = this.resolve(addr, size, true);
    const old = r.init.slice(r.off, r.off + size);
    r.init.fill(0, r.off, r.off + size);
    return old;
  }

  // ------------------------------------------------------------------ heap

  malloc(size: number, line: number, fn: string): HeapBlock | null {
    if (size < 0 || this.heapLive + size > HEAP_LIMIT) return null;
    const addr = this.heapNext;
    const block: HeapBlock = {
      id: this.blockCounter++,
      addr,
      size,
      data: new Uint8Array(size),
      init: new Uint8Array(size),
      freed: false,
      line,
      fn,
    };
    // 16-byte aligned payloads separated by red zones (plus a fake chunk header).
    this.heapNext = addr + Math.ceil((Math.max(size, 1) + HEAP_REDZONE) / 16) * 16 + 16;
    this.heap.push(block);
    this.heapLive += size;
    return block;
  }

  free(block: HeapBlock, line: number): void {
    block.freed = true;
    block.freedLine = line;
    this.heapLive -= block.size;
    // Freed payloads are never read again (every access is rejected), so drop them.
    block.data = new Uint8Array(0);
    block.init = new Uint8Array(0);
  }

  describeAddress(addr: number): string {
    if (addr >= this.sp && addr < STACK_TOP) {
      const f = this.frameAt(addr);
      const o = f ? this.findObject(f.objects, addr) : null;
      if (o) return `${o.name} in ${f!.name}()`;
    }
    const b = this.heapBlockAt(addr);
    if (b) return `heap block of ${b.size} bytes`;
    const g = this.findObject(this.globalObjects, addr);
    if (g) return g.name;
    return hex(addr);
  }
}

function nearestObject(objects: MemObject[], addr: number): MemObject | null {
  let best: MemObject | null = null;
  let bestD = Infinity;
  for (const o of objects) {
    if (o.name.startsWith('__')) continue;
    const d = addr < o.addr ? o.addr - addr : addr - (o.addr + o.size) + 1;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return bestD <= 64 ? best : null;
}

function describeOverflow(o: MemObject, addr: number): string {
  if (addr >= o.addr + o.size) return `'${o.name}' (${addr - (o.addr + o.size)} bytes past its end; it is ${o.size} bytes)`;
  if (addr < o.addr) return `'${o.name}' (${o.addr - addr} bytes before its start)`;
  return `'${o.name}' (the access runs past its ${o.size}-byte end)`;
}

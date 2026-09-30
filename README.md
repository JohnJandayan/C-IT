# C-It: An Animated C Code Visualizer

C-It compiles and runs C **entirely in your browser** and animates what the program does to memory: stack frames, heap blocks, pointers, arrays, linked lists, trees, stacks and queues, step by step. The UI keeps a MARIE-style layout: editor on the left, visualization on the top right, program state and console on the bottom right, and a control bar along the bottom.

No server, no API keys and no cost: your code never leaves the browser.

## Features

- **A C interpreter in the browser.** A preprocessor, parser, type checker and bytecode VM written in TypeScript, running in a Web Worker.
- **gcc-style diagnostics as you type.** For example `main.c:5:12: error: expected ';' before 'return'`, plus `-Wformat`-style printf/scanf checks and missing-`#include` hints.
- **Memory-error detection, like AddressSanitizer.** It catches heap, stack and global buffer overflows, use-after-free, double free, invalid free, NULL dereference, writes to string literals, stack overflow and division by zero. It also warns about uninitialized reads and signed overflow, and reports leaks when the program exits.
- **Two views:**
  - **Structures:** detected arrays (cells or bars, with `i`/`j` index markers), strings, matrices, linked lists, binary trees, array-based stacks and queues, and a Stack & Heap diagram with animated pointer arrows.
  - **Memory:** a MARIE-style hex grid of the stack, heap, globals and read-only data. Bytes are colored by the variable that owns them and flash when read or written.
- **Stepping granularity:** **Line** (one statement per step) or **Expr** (each sub-expression, e.g. `a[j] > a[j+1] ⇒ 1`).
- **Animations:** values that change flash and slide in, copied values fly from their source to their destination (swaps are visible), pointer arrows re-route, and frames and heap blocks pop in and out. There's a *Less motion* toggle, and the OS reduced-motion setting is respected.
- **Interactive input:** `scanf`, `getchar` and `fgets` pause the program and show an input line in the console. **EOF** or Ctrl+D sends end-of-file.
- **Debugger controls:** breakpoints (click the gutter or press F9), Continue (F5), Run to cursor (right-click in the editor), a timeline scrubber, and stepping backward.
- **Auto-save and share links:** code and settings persist in `localStorage`. **Share** copies a link with the program compressed into the URL fragment, which browsers never send to a server.
- **36 examples:** basics, sorting (bubble, selection, insertion, merge, quick), searching, pointers, structs, recursion, linked lists, BST, stack, circular queue, `realloc`, `scanf`, and intentional memory bugs.

## Run it locally

Requirements: **Node.js 20.19+** (22 LTS recommended) and npm.

```bash
npm install
npm run dev          # http://localhost:3000 (opens automatically)
```

Other scripts:

```bash
npm test             # engine + UI test suite (Vitest)
npm run build        # type-check and production build into dist/
npm run preview      # serve dist/ on http://localhost:4173 with production security headers
```

`npm run preview` is the closest to production: it sends the same Content-Security-Policy as the deployed site, so run it once before deploying.

## Deploying

The app is a static site (`dist/`), so any static host works. Both configurations are included:

| | Cloudflare Pages (recommended) | Vercel |
|---|---|---|
| Free plan bandwidth | Unlimited | Monthly quota on Hobby |
| Commercial use on free plan | Allowed | Hobby is non-commercial only |
| Config in this repo | `public/_headers` | `vercel.json` |

**Cloudflare Pages:** Workers & Pages → Create → Pages → connect the Git repo.
- Build command `npm run build`, output directory `dist`.
- The Node version comes from `.node-version` (22).
- Unknown paths fall back to `index.html` automatically.

**Vercel:** import the repo. `vercel.json` sets the build, the SPA rewrite and the headers. In *Project Settings → General*, set the Node.js version to 22.x. No environment variables are needed.

## How it works

```
Monaco editor ── check / run / input / stop ──▶ Web Worker (sandbox)
                                                 preprocessor → parser + type checker
                                                 → bytecode compiler → VM with checked memory
    ◀── diagnostics, trace chunks, "need input", done ──
Timeline (main thread): applies/undoes per-step memory deltas
    → view model (frames, heap, detected shapes) → React renderers
```

- **Source layout:**
  - `src/engine/`: the compiler and VM (`lexer`, `preprocessor`, `parser`, `compiler`, `vm`, `memory`, `stdlib`, `format`, `worker`, `client`).
  - `src/viewmodel/`: the trace mirror (`timeline.ts`), view building (`view.ts`) and data-structure detection (`shapes.ts`).
  - `src/components/`: the UI. Visualizers live in `components/visualizers` and `components/viz`.
- **Memory model:** x86-64 LP64 sizes (`int` 4, `long`/pointers 8), little-endian bytes, and realistic addresses (stack near `0x7ffe…`, heap from `0x5555555592a0`, globals near `0x404000`). Every byte has an "initialized" flag, and red zones between objects catch overflows.
- **Trace:** each step records only its memory writes (old and new bytes), reads, frame/scope/heap events and new output, streamed to the UI every ~16 ms. Stepping backward undoes the deltas, so any step is reachable without storing snapshots.
- **Data-structure detection uses real types:**
  - A struct with one pointer to its own type is a list; `prev`/`next` makes it doubly linked; `left`/`right` makes it a tree.
  - A struct with an array plus `top` is a stack; with `front`/`rear` it's a queue.
  - `T[n][m]` is a matrix and a `char[]` is a string.

## Supported C

C99/C11 core language:
- All operators, integer promotions and conversions (with exact 32/64-bit wraparound), `float`/`double`.
- Pointers and pointer arithmetic, multi-dimensional arrays and VLAs.
- `struct`/`union`/`enum`/`typedef`, designated initializers, compound literals.
- Function pointers, recursion, variadic functions (`<stdarg.h>`), `switch`, `goto`.
- The preprocessor (`#define` with `#`/`##`/`__VA_ARGS__`, `#if`/`#ifdef`, `#include` of standard headers).

Library functions:
- `stdio.h`: `printf` family, `scanf` family, `getchar`, `fgets`, `puts`, …
- `stdlib.h`: `malloc`, `calloc`, `realloc`, `free`, `atoi`, `strtol`, `rand` (glibc-compatible sequence), `qsort`, `bsearch`, `exit`, …
- `string.h`, `math.h`, `ctype.h`, `stdbool.h`, `stdint.h`, `inttypes.h`, `limits.h`, `float.h`, `assert.h`, `time.h`, `errno.h`.

Not supported (you get a clear error instead):
- Bit-fields, `_Generic`, complex numbers, `setjmp`/`longjmp`, threads, signals.
- File I/O: `fopen` returns `NULL`, and only stdin/stdout/stderr exist.
- Multi-file programs and non-standard headers such as `conio.h`/`windows.h`.

## Limits and security

- **Limits:**
  - 64 KB of source and 64 KB of output.
  - 200,000 recorded steps. The program keeps running after that to finish its output.
  - 30 million instructions, which stops infinite loops.
  - 1 MB stack and 16 MB heap.
- **No native code runs.** The interpreter only touches its own typed arrays.
- **Isolated worker.** The worker has no DOM access, and a watchdog restarts it if it ever stops responding.
- **Plain-text output.** Program output is always rendered as text, never HTML.
- **Validated share links.** They are size-capped and validated before decoding.
- **Security headers:** a strict Content-Security-Policy (self plus `cdn.jsdelivr.net` for Monaco), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl+Enter | Run / visualize |
| Space | Play / pause |
| → / ← | Next / previous step |
| Shift+→ / Shift+← | Next / previous expression step |
| Home / End | First / last step |
| F5 | Continue to next breakpoint |
| F9 (in editor) | Toggle breakpoint |

## License

MIT, see [LICENSE](LICENSE).

**Built by John Jandayan** · [Portfolio](https://portfolio-john-jandayan.vercel.app/)

// Diagnostics shared by every compiler stage. Positions are 1-based.

export type Severity = 'error' | 'warning' | 'note';

export interface SrcPos {
  line: number;
  col: number;
  /** Source file; undefined means the user's main.c. Built-in headers use '<name.h>'. */
  file?: string;
}

export interface SrcRange extends SrcPos {
  endLine: number;
  endCol: number;
}

export interface Diagnostic extends SrcRange {
  severity: Severity;
  message: string;
}

export const MAIN_FILE = 'main.c';
const MAX_DIAGNOSTICS = 50;

/** Thrown to abort compilation after a fatal error (e.g. a missing header). */
export class FatalError extends Error {}

export class DiagnosticBag {
  readonly items: Diagnostic[] = [];
  private seen = new Set<string>();

  report(severity: Severity, message: string, pos: SrcPos, end?: SrcPos): void {
    // Diagnostics inside built-in headers are attributed to line 1 of main.c so they stay visible.
    const inHeader = pos.file !== undefined && pos.file !== MAIN_FILE;
    const line = inHeader ? 1 : pos.line;
    const col = inHeader ? 1 : pos.col;
    const endLine = inHeader ? 1 : end?.line ?? pos.line;
    const endCol = inHeader ? 2 : end?.col ?? pos.col + 1;
    const key = `${severity}:${line}:${col}:${message}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.items.push({ severity, message, line, col, endLine, endCol, file: MAIN_FILE });
    if (this.errorCount() >= MAX_DIAGNOSTICS) {
      throw new FatalError('too many errors emitted, stopping now');
    }
  }

  error(message: string, pos: SrcPos, end?: SrcPos): void {
    this.report('error', message, pos, end);
  }

  warning(message: string, pos: SrcPos, end?: SrcPos): void {
    this.report('warning', message, pos, end);
  }

  note(message: string, pos: SrcPos, end?: SrcPos): void {
    this.report('note', message, pos, end);
  }

  errorCount(): number {
    return this.items.filter((d) => d.severity === 'error').length;
  }

  hasErrors(): boolean {
    return this.items.some((d) => d.severity === 'error');
  }

  sorted(): Diagnostic[] {
    return [...this.items].sort((a, b) => a.line - b.line || a.col - b.col);
  }
}

/** gcc-style one-line rendering: `main.c:12:5: error: message`. */
export function formatDiagnostic(d: Diagnostic): string {
  return `${d.file ?? MAIN_FILE}:${d.line}:${d.col}: ${d.severity}: ${d.message}`;
}

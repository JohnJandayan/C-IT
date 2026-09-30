import React, { useEffect, useRef, useState } from 'react';
import { formatDiagnostic } from '@/engine/diagnostics';
import { useVisualizationStore } from '@/store/visualizationStore';

const SEG_CLASS: Record<string, string> = {
  out: 'text-gray-200',
  err: 'text-red-300',
  in: 'text-cyan-300 italic',
  sys: 'text-amber-300',
};

const OutputConsole: React.FC = () => {
  const view = useVisualizationStore((s) => s.view);
  const awaitingInput = useVisualizationStore((s) => s.awaitingInput);
  const submitInput = useVisualizationStore((s) => s.submitInput);
  const diagnostics = useVisualizationStore((s) => s.diagnostics);
  const status = useVisualizationStore((s) => s.status);
  const inputHint = useVisualizationStore((s) => s.inputHint);
  const [text, setText] = useState('');
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const output = view?.output ?? [];
  const outLen = output.reduce((n, s) => n + s.s.length, 0);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [outLen, awaitingInput, view]);

  useEffect(() => {
    if (awaitingInput) inputRef.current?.focus();
  }, [awaitingInput]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    submitInput(text);
    setText('');
  };

  const compileProblems = status === 'error' && !view ? diagnostics : [];

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Console Output</h3>
        <span className="text-xs text-gray-500">
          {status === 'input' ? 'waiting for input' : status === 'running' ? 'running…' : ''}
        </span>
      </div>
      <div ref={consoleRef} className="flex-1 overflow-auto p-4 font-mono text-sm" role="log" aria-live="polite" aria-label="Program output">
        {compileProblems.length > 0 ? (
          <div className="space-y-1">
            {compileProblems.map((d, i) => (
              <div key={i} className={d.severity === 'error' ? 'text-red-300' : d.severity === 'warning' ? 'text-amber-300' : 'text-gray-400'}>
                {formatDiagnostic(d)}
              </div>
            ))}
          </div>
        ) : output.length === 0 && !awaitingInput ? (
          <div className="text-gray-500 italic">No output yet</div>
        ) : (
          <pre className="whitespace-pre-wrap break-words m-0 font-mono">
            {output.map((seg, i) => (
              <span key={i} className={SEG_CLASS[seg.k]}>
                {seg.s}
              </span>
            ))}
          </pre>
        )}
        {awaitingInput && (
          <form onSubmit={send} className="mt-2 flex items-center gap-2 cit-input-pulse rounded border border-yellow-600/60 bg-gray-800 px-2 py-1">
            <span className="text-yellow-400 select-none" aria-hidden="true">›</span>
            <label htmlFor="cit-stdin" className="sr-only">Program input</label>
            <input
              id="cit-stdin"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                  e.preventDefault();
                  submitInput(null);
                }
              }}
              className="flex-1 bg-transparent outline-none text-cyan-200 font-mono"
              placeholder={inputHint ? `Type input and press Enter (try: ${inputHint})` : 'Type input and press Enter'}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white">Send</button>
            <button
              type="button"
              onClick={() => submitInput(null)}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
              title="Send end-of-file (Ctrl+D)"
            >
              EOF
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OutputConsole;

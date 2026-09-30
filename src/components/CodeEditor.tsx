import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useVisualizationStore } from '@/store/visualizationStore';
import { engine } from '@/engine/client';
import { StepKind } from '@/engine/protocol';

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

const CHECK_DELAY_MS = 300;

const CodeEditor: React.FC = () => {
  const code = useVisualizationStore((s) => s.code);
  const setCode = useVisualizationStore((s) => s.setCode);
  const diagnostics = useVisualizationStore((s) => s.diagnostics);
  const view = useVisualizationStore((s) => s.view);
  const breakpoints = useVisualizationStore((s) => s.breakpoints);
  const granularity = useVisualizationStore((s) => s.granularity);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const execDecorations = useRef<ReturnType<MonacoEditor['createDecorationsCollection']> | null>(null);
  const bpDecorations = useRef<ReturnType<MonacoEditor['createDecorationsCollection']> | null>(null);
  const [ready, setReady] = React.useState(false);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    execDecorations.current = editor.createDecorationsCollection();
    bpDecorations.current = editor.createDecorationsCollection();

    editor.addAction({
      id: 'cit.run',
      label: 'C-It: Run and visualize',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => useVisualizationStore.getState().executeCode(),
    });
    editor.addAction({
      id: 'cit.toggleBreakpoint',
      label: 'C-It: Toggle breakpoint',
      keybindings: [monaco.KeyCode.F9],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: (ed) => {
        const line = ed.getPosition()?.lineNumber;
        if (line) useVisualizationStore.getState().toggleBreakpoint(line);
      },
    });
    editor.addAction({
      id: 'cit.runToCursor',
      label: 'C-It: Run to cursor',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2,
      run: (ed) => {
        const line = ed.getPosition()?.lineNumber;
        const st = useVisualizationStore.getState();
        if (!line) return;
        if (st.cursor < 0 && st.status !== 'running') {
          st.executeCode();
          // Wait for the run to begin streaming, then jump.
          setTimeout(() => useVisualizationStore.getState().runToLine(line), 50);
        } else st.runToLine(line);
      },
    });
    editor.onMouseDown((e) => {
      const t = e.target;
      if (
        t.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        t.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS
      ) {
        const line = t.position?.lineNumber;
        if (line) useVisualizationStore.getState().toggleBreakpoint(line);
      }
    });
    setReady(true);
  };

  // Live diagnostics while typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      engine()
        .check(code)
        .then((d) => {
          if (useVisualizationStore.getState().code === code) useVisualizationStore.getState().setDiagnostics(d);
        })
        .catch(() => undefined);
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code]);

  // Squiggles.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      'c-it',
      diagnostics.map((d) => ({
        severity:
          d.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.line,
        startColumn: d.col,
        endLineNumber: d.endLine,
        endColumn: Math.max(d.endCol, d.col + 1),
        source: 'gcc (C-It)',
      }))
    );
  }, [diagnostics, ready]);

  // Breakpoints.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !bpDecorations.current) return;
    bpDecorations.current.set(
      breakpoints.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          glyphMarginClassName: 'cit-breakpoint',
          glyphMarginHoverMessage: { value: 'Breakpoint (click to remove)' },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      }))
    );
  }, [breakpoints, ready]);

  // Execution highlight: next line (blue), line just executed (green), expression range.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const coll = execDecorations.current;
    if (!editor || !monaco || !coll) return;
    const step = view?.step;
    if (!step) {
      coll.clear();
      return;
    }
    const lineCount = editor.getModel()?.getLineCount() ?? 1;
    const line = Math.min(Math.max(step.l, 1), lineCount);
    const isError = step.k === StepKind.Error;
    const isInput = step.k === StepKind.Input;
    const decos: Parameters<typeof coll.set>[0][number][] = [];
    if (view?.prevLine && view.prevLine !== line && !isError) {
      decos.push({
        range: new monaco.Range(view.prevLine, 1, view.prevLine, 1),
        options: {
          isWholeLine: true,
          className: 'cit-prev-line',
          linesDecorationsClassName: 'cit-prev-glyph',
          overviewRuler: { color: '#22c55e88', position: monaco.editor.OverviewRulerLane.Left },
        },
      });
    }
    decos.push({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: isError ? 'cit-error-line' : isInput ? 'cit-input-line' : 'cit-current-line',
        linesDecorationsClassName: isError ? 'cit-error-glyph' : 'cit-current-glyph',
        overviewRuler: { color: isError ? '#ef4444' : '#3b82f6', position: monaco.editor.OverviewRulerLane.Full },
        hoverMessage: isError ? { value: `**Runtime error:** ${step.v ?? ''}` } : undefined,
      },
    });
    const showRange = granularity === 'expr' || step.k === StepKind.Expr || step.k === StepKind.Sub;
    if (showRange && step.el >= step.l && !(step.el === step.l && step.ec <= step.c + 1)) {
      decos.push({
        range: new monaco.Range(step.l, step.c, step.el, step.ec),
        options: {
          inlineClassName: step.k === StepKind.Expr ? 'cit-expr-range' : 'cit-stmt-range',
          after:
            step.k === StepKind.Expr && step.v !== undefined
              ? { content: ` ⇒ ${step.v}`, inlineClassName: 'cit-expr-value' }
              : undefined,
        },
      });
    }
    coll.set(decos);
    editor.revealLineInCenterIfOutsideViewport(line);
  }, [view, granularity, ready]);

  return (
    <div className="relative h-full bg-[#1e1e1e]" aria-label="C source code editor">
      <Editor
        height="100%"
        defaultLanguage="c"
        value={code}
        theme="vs-dark"
        onChange={(v) => v !== undefined && setCode(v)}
        onMount={handleMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          lineNumbers: 'on',
          glyphMargin: true,
          renderWhitespace: 'selection',
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fixedOverflowWidgets: true,
          padding: { top: 10 },
        }}
      />
    </div>
  );
};

export default CodeEditor;

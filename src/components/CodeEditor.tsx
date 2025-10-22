import React, { useEffect, useRef } from 'react';
// @ts-ignore - Monaco Editor types
import Editor from '@monaco-editor/react';
import { useVisualizationStore } from '@/store/visualizationStore';

interface CodeEditorProps {
  className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ className = '' }) => {
  const { code, setCode, currentStep, trace } = useVisualizationStore();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      tabSize: 4,
      insertSpaces: false, // Use tabs
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Highlight current line during execution
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !trace || trace.steps.length === 0) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentStepData = trace.steps[currentStep];

    if (currentStepData) {
      const lineNumber = currentStepData.lineNumber;

      // Remove old decorations
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [
          {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'current-line-highlight',
              glyphMarginClassName: 'current-line-glyph',
              glyphMarginHoverMessage: { value: 'Current execution step' },
              inlineClassName: 'current-line-text',
              linesDecorationsClassName: 'current-line-decoration',
            },
          },
        ]
      );

      // Scroll to the current line
      editor.revealLineInCenter(lineNumber);
    }
  }, [currentStep, trace]);

  return (
    <div className={`relative h-full ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="c"
        value={code}
        theme="vs-dark"
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          tabSize: 4,
          insertSpaces: false,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
      />
      <style>{`
        .current-line-highlight {
          background-color: rgba(59, 130, 246, 0.15);
          border-left: 3px solid #3b82f6;
        }
        .current-line-glyph {
          background-color: #3b82f6;
          width: 5px !important;
          margin-left: 3px;
        }
        .current-line-decoration {
          background-color: #3b82f6;
          width: 5px !important;
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;

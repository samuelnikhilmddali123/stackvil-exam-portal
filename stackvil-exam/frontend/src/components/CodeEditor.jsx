import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({
  language = 'javascript',
  value = '',
  onChange,
  theme = 'light',
}) => {
  // Convert standard language identifiers to Monaco editor supported keys
  const getMonacoLanguage = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'c':
      case 'cpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'python':
        return 'python';
      case 'javascript':
      case 'nodejs':
        return 'javascript';
      default:
        return 'javascript';
    }
  };

  const handleEditorChange = (val) => {
    if (onChange) {
      onChange(val);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner h-[400px]">
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={value}
        onChange={handleEditorChange}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          fontFamily: "'Courier New', Courier, monospace",
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          tabSize: 2,
        }}
      />
    </div>
  );
};

export default CodeEditor;

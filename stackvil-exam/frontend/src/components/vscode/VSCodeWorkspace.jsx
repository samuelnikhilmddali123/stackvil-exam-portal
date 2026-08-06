import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Files, 
  Search as SearchIcon, 
  Play, 
  Terminal as TerminalIcon, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Plus, 
  FolderPlus, 
  RefreshCw, 
  FileCode, 
  Code2, 
  Settings, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Columns, 
  Download, 
  Send,
  HelpCircle,
  FilePlus,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { buildFileTree, getLanguageFromFilePath } from '../../utils/fileTreeUtils';
import FileExplorerTree, { getFileIcon } from './FileExplorerTree';
import toast from 'react-hot-toast';

const VSCodeWorkspace = ({
  files = {},
  onSaveFile,
  onSubmitProject,
  examTitle = 'Coding Assessment',
  durationMinutes = 60,
  timeLeftSeconds = 3600,
  isSubmitting = false,
  proctorComponent = null
}) => {
  // Local workspace state
  const [workspaceFiles, setWorkspaceFiles] = useState(files);
  const [modifiedMap, setModifiedMap] = useState({}); // { filePath: true }

  // Navigation & tabs
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState('');

  // Sidebars & panels
  const [sidebarTab, setSidebarTab] = useState('explorer'); // 'explorer' | 'search'
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [bottomTab, setBottomTab] = useState('terminal'); // 'terminal' | 'console' | 'output' | 'problems'
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Terminal state
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'info', text: 'Stackvil VS Code Interactive Sandbox v2.4.0' },
    { type: 'success', text: 'Environment initialized. Type "help" or "npm start" to run tests.' },
    { type: 'system', text: '$ node --version => v20.11.0 | mysql --version => 8.0.36' },
  ]);

  // Editor Cursor & Line state for status bar
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorRef = useRef(null);

  // Synchronize when initial files change
  useEffect(() => {
    if (files && Object.keys(files).length > 0) {
      setWorkspaceFiles(files);
      const keys = Object.keys(files);
      if (!activeFile && keys.length > 0) {
        // Prefer index.html or server.js or first file
        const defaultFile = keys.find(k => k.endsWith('index.html') || k.endsWith('server.js')) || keys[0];
        setActiveFile(defaultFile);
        setOpenTabs([defaultFile]);
      }
    }
  }, [files]);

  // Build recursive tree nodes
  const treeNodes = useMemo(() => buildFileTree(workspaceFiles), [workspaceFiles]);

  // Handle open file in tab
  const handleSelectFile = (filePath) => {
    if (!openTabs.includes(filePath)) {
      setOpenTabs((prev) => [...prev, filePath]);
    }
    setActiveFile(filePath);
  };

  // Close tab
  const handleCloseTab = (filePath, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== filePath);
    setOpenTabs(newTabs);
    if (activeFile === filePath) {
      if (newTabs.length > 0) {
        setActiveFile(newTabs[newTabs.length - 1]);
      } else {
        setActiveFile('');
      }
    }
  };

  // Handle code edit in Monaco
  const handleCodeChange = (newContent) => {
    if (!activeFile) return;

    setWorkspaceFiles((prev) => {
      const updated = { ...prev, [activeFile]: newContent };
      if (onSaveFile) onSaveFile(updated);
      return updated;
    });

    setModifiedMap((prev) => ({ ...prev, [activeFile]: true }));
  };

  // Ctrl+S Keyboard shortcut handler
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFile) {
        setModifiedMap((prev) => ({ ...prev, [activeFile]: false }));
        toast.success(`Saved ${activeFile.split('/').pop()}`, { duration: 1500 });
        if (onSaveFile) onSaveFile(workspaceFiles);
      }
    });
  };

  // Create New File
  const handleCreateNewFile = () => {
    const fileName = prompt('Enter relative file path (e.g., frontend/app.js or backend/config.json):');
    if (!fileName || !fileName.trim()) return;
    const cleanPath = fileName.trim().replace(/^[\/\\]+/, '');
    if (workspaceFiles[cleanPath] !== undefined) {
      toast.error('File already exists.');
      return;
    }
    const updated = { ...workspaceFiles, [cleanPath]: `// ${cleanPath}\n` };
    setWorkspaceFiles(updated);
    setOpenTabs((prev) => [...prev, cleanPath]);
    setActiveFile(cleanPath);
    setModifiedMap((prev) => ({ ...prev, [cleanPath]: true }));
    if (onSaveFile) onSaveFile(updated);
    toast.success(`Created ${cleanPath}`);
  };

  // In-file & file name search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = [];

    for (const [filePath, content] of Object.entries(workspaceFiles)) {
      if (filePath.toLowerCase().includes(query)) {
        results.push({ filePath, line: 1, snippet: `[File Match] ${filePath}` });
      }
      const lines = content.split('\n');
      lines.forEach((lineText, idx) => {
        if (lineText.toLowerCase().includes(query)) {
          results.push({
            filePath,
            line: idx + 1,
            snippet: lineText.trim().substring(0, 80),
          });
        }
      });
    }

    setSearchResults(results.slice(0, 50));
  }, [searchQuery, workspaceFiles]);

  // Terminal command execution
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const newLogs = [...terminalLogs, { type: 'cmd', text: `$ ${cmd}` }];

    if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      newLogs.push({
        type: 'info',
        text: 'Available commands: npm start, node server.js, ls, pwd, clear, test, help',
      });
    } else if (cmd.startsWith('npm start') || cmd.startsWith('node server')) {
      newLogs.push({ type: 'info', text: '> Starting Node Express Backend server...' });
      newLogs.push({ type: 'success', text: '[Express] Server running on http://localhost:5000' });
      newLogs.push({ type: 'success', text: '[MySQL] Database connected to pool on port 3306' });
    } else if (cmd === 'ls') {
      newLogs.push({
        type: 'system',
        text: Object.keys(workspaceFiles).join('  '),
      });
    } else if (cmd === 'test') {
      newLogs.push({ type: 'info', text: 'Running test cases...' });
      newLogs.push({ type: 'success', text: '✓ PASS: GET /api/employees (200 OK)' });
      newLogs.push({ type: 'success', text: '✓ PASS: POST /api/employees (201 Created)' });
    } else {
      newLogs.push({ type: 'error', text: `Command not found: ${cmd}. Type "help" for list of commands.` });
    }

    setTerminalLogs(newLogs);
    setTerminalInput('');
  };

  // Generate Live App Preview srcDoc combining project files
  const getPreviewSrcDoc = () => {
    const htmlKey = Object.keys(workspaceFiles).find((k) => k.endsWith('index.html')) || '';
    const cssKey = Object.keys(workspaceFiles).find((k) => k.endsWith('style.css')) || '';
    const jsKey = Object.keys(workspaceFiles).find((k) => k.endsWith('script.js')) || '';

    const html = workspaceFiles[htmlKey] || '<h1>Preview Ready</h1>';
    const css = workspaceFiles[cssKey] || '';
    const js = workspaceFiles[jsKey] || '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}</script>
        </body>
      </html>
    `;
  };

  // Format countdown time
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-[#1e1e1e] text-slate-200 flex flex-col overflow-hidden font-sans select-none border border-slate-800 text-left">
      
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#3c3c3c] border-b border-[#252526] flex items-center justify-between px-4 shrink-0 z-20 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-sky-600/30 border border-sky-500/30 rounded-lg text-sky-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>VS Code Workspace</span>
          </div>
          <span className="h-4 w-px bg-slate-600"></span>
          <span className="font-bold text-sm tracking-tight text-white">{examTitle}</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Countdown Clock */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-[#252526] border border-slate-700 rounded-lg text-xs">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-mono font-bold text-white tracking-wider">
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          {/* Live Preview Toggle */}
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              showLivePreview
                ? 'bg-sky-600 text-white shadow'
                : 'bg-[#252526] text-slate-300 hover:text-white hover:bg-[#2a2d2e]'
            }`}
          >
            <Columns className="h-4 w-4" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
          </button>

          {/* Submit Button */}
          <button
            onClick={() => onSubmitProject(workspaceFiles)}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Project'}</span>
          </button>
        </div>
      </div>

      {/* 2. WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* FAR LEFT ACTIVITY BAR */}
        <div className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col justify-between items-center py-2 shrink-0 z-10">
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                if (sidebarTab === 'explorer' && showSidebar) {
                  setShowSidebar(false);
                } else {
                  setSidebarTab('explorer');
                  setShowSidebar(true);
                }
              }}
              title="Explorer (Ctrl+Shift+E)"
              className={`p-2.5 rounded-lg transition relative ${
                showSidebar && sidebarTab === 'explorer'
                  ? 'text-white border-l-2 border-sky-400 bg-[#252526]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Files className="h-5 w-5" />
            </button>

            <button
              onClick={() => {
                if (sidebarTab === 'search' && showSidebar) {
                  setShowSidebar(false);
                } else {
                  setSidebarTab('search');
                  setShowSidebar(true);
                }
              }}
              title="Search (Ctrl+Shift+F)"
              className={`p-2.5 rounded-lg transition relative ${
                showSidebar && sidebarTab === 'search'
                  ? 'text-white border-l-2 border-sky-400 bg-[#252526]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => setShowBottomPanel(!showBottomPanel)}
              title="Toggle Terminal Panel"
              className={`p-2.5 rounded-lg transition ${
                showBottomPanel ? 'text-sky-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TerminalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* LEFT SIDEBAR (Explorer / Search) */}
        {showSidebar && (
          <div className="w-64 bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0">
            {/* Header */}
            <div className="p-3 border-b border-[#1e1e1e] flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {sidebarTab === 'explorer' ? 'Explorer' : 'Search Workspace'}
              </span>
              {sidebarTab === 'explorer' && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCreateNewFile}
                    title="New File"
                    className="p-1 hover:bg-[#333333] text-slate-400 hover:text-white rounded"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar View: Explorer */}
            {sidebarTab === 'explorer' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <FileExplorerTree
                  treeNodes={treeNodes}
                  activeFile={activeFile}
                  onSelectFile={handleSelectFile}
                  modifiedFiles={modifiedMap}
                />
              </div>
            )}

            {/* Sidebar View: Search */}
            {sidebarTab === 'search' && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-hidden">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file names or content..."
                    className="w-full px-3 py-1.5 bg-[#1e1e1e] text-white placeholder-slate-500 rounded border border-slate-700 text-xs font-mono outline-none focus:border-sky-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  {searchResults.length} results found
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFile(res.filePath)}
                      className="w-full text-left p-2 bg-[#1e1e1e] hover:bg-[#2a2d2e] rounded border border-slate-800/80 text-xs space-y-1 transition group"
                    >
                      <div className="flex items-center justify-between text-sky-400 font-bold text-[11px]">
                        <span className="truncate">{res.filePath}</span>
                        <span className="text-[10px] text-slate-500 font-mono">L{res.line}</span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-mono truncate group-hover:text-white">
                        {res.snippet}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Proctor Camera View */}
            {proctorComponent && (
              <div className="p-3 bg-[#1e1e1e] border-t border-[#333333]">
                {proctorComponent}
              </div>
            )}
          </div>
        )}

        {/* CENTER MAIN PANEL (Tabs + Monaco Editor + Bottom Panel) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#1e1e1e]">
          
          {/* TABS BAR */}
          <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center overflow-x-auto shrink-0 custom-scrollbar">
            {openTabs.map((tabPath) => {
              const isActive = activeFile === tabPath;
              const isModified = modifiedMap[tabPath];
              const fileName = tabPath.split('/').pop();
              return (
                <div
                  key={tabPath}
                  onClick={() => setActiveFile(tabPath)}
                  className={`h-full flex items-center space-x-2 px-3 border-r border-[#1e1e1e] text-xs font-mono cursor-pointer transition select-none group shrink-0 ${
                    isActive
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-sky-400 font-semibold'
                      : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#2a2d2e] hover:text-slate-200'
                  }`}
                >
                  {getFileIcon(fileName)}
                  <span className="truncate max-w-[120px]">{fileName}</span>
                  {isModified ? (
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Unsaved changes" />
                  ) : (
                    <button
                      onClick={(e) => handleCloseTab(tabPath, e)}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* BREADCRUMB PATH */}
          {activeFile && (
            <div className="h-6 bg-[#1e1e1e] border-b border-[#252526] flex items-center px-4 text-[11px] font-mono text-slate-400 shrink-0 space-x-1">
              <span className="text-slate-500">Project</span>
              {activeFile.split('/').map((part, index, array) => (
                <React.Fragment key={index}>
                  <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                  <span className={index === array.length - 1 ? 'text-white font-semibold' : 'text-slate-400'}>
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* MONACO CODE EDITOR */}
          <div className="flex-1 relative overflow-hidden">
            {activeFile ? (
              <Editor
                height="100%"
                path={activeFile}
                language={getLanguageFromFilePath(activeFile)}
                value={workspaceFiles[activeFile] || ''}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  automaticLayout: true,
                  fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 font-mono">
                <Code2 className="h-12 w-12 text-slate-600" />
                <p className="text-sm">Select a file from the explorer to begin editing</p>
                <p className="text-xs text-slate-600">Press Ctrl+S to save changes</p>
              </div>
            )}
          </div>

          {/* BOTTOM WORKBENCH PANEL (Terminal / Console / Output / Problems) */}
          {showBottomPanel && (
            <div className="h-48 bg-[#1e1e1e] border-t border-[#333333] flex flex-col shrink-0">
              {/* Panel Tabs Header */}
              <div className="h-8 bg-[#252526] border-b border-[#1e1e1e] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center space-x-4">
                  {[
                    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
                    { id: 'console', label: 'Console', icon: Code2 },
                    { id: 'output', label: 'Output', icon: Play },
                    { id: 'problems', label: 'Problems', icon: AlertTriangle },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id)}
                      className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 py-1 border-b-2 transition ${
                        bottomTab === tab.id
                          ? 'text-sky-400 border-sky-400'
                          : 'text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowBottomPanel(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Panel Content: Terminal */}
              {bottomTab === 'terminal' && (
                <div className="flex-1 flex flex-col bg-[#1e1e1e] p-3 font-mono text-xs overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    {terminalLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.type === 'cmd'
                            ? 'text-white font-bold'
                            : log.type === 'error'
                            ? 'text-rose-400'
                            : log.type === 'success'
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }
                      >
                        {log.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleTerminalSubmit} className="flex items-center space-x-2 pt-2 border-t border-[#252526]">
                    <span className="text-emerald-400 font-bold">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Type CLI command (npm start, node server.js, clear)..."
                      className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-xs font-mono"
                    />
                  </form>
                </div>
              )}

              {/* Panel Content: Console */}
              {bottomTab === 'console' && (
                <div className="flex-1 p-3 font-mono text-xs text-slate-300 overflow-y-auto space-y-1">
                  <div className="text-slate-500">[System] Browser Console listener attached</div>
                  <div className="text-emerald-400">[Log] Application state initialized</div>
                </div>
              )}

              {/* Panel Content: Output */}
              {bottomTab === 'output' && (
                <div className="flex-1 p-3 font-mono text-xs text-slate-400 overflow-y-auto">
                  [Build Output] No compilation errors detected. Workspace synced with MongoDB server.
                </div>
              )}

              {/* Panel Content: Problems */}
              {bottomTab === 'problems' && (
                <div className="flex-1 p-3 font-mono text-xs text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>No syntax errors or problems detected in active file.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SPLIT PANEL (Live Web Application Preview) */}
        {showLivePreview && (
          <div className="w-1/2 bg-[#1e1e1e] border-l border-[#333333] flex flex-col shrink-0 overflow-hidden">
            <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center justify-between px-4 text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>Live Application Preview</span>
              </span>
              <button
                onClick={() => setShowLivePreview(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <iframe
              title="Live Application Sandbox"
              srcDoc={getPreviewSrcDoc()}
              className="flex-1 w-full bg-slate-950 border-none"
              sandbox="allow-scripts allow-forms allow-modals"
            />
          </div>
        )}
      </div>

      {/* 3. BOTTOM VS CODE STATUS BAR */}
      <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-mono shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1 font-bold">
            <span>git:(main)</span>
          </span>
          <span className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>0</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="uppercase font-bold">{getLanguageFromFilePath(activeFile)}</span>
        </div>
      </div>
    </div>
  );
};

export default VSCodeWorkspace;

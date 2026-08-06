import React, { useRef, useState, useMemo } from 'react';
import { 
  FolderPlus, 
  CheckCircle2, 
  FileCode2, 
  Layers, 
  Trash2, 
  Eye, 
  Search, 
  FolderTree,
  ChevronRight,
  Code
} from 'lucide-react';
import { buildFileTree, readUploadedFolderFiles } from '../../utils/fileTreeUtils';
import FileExplorerTree from './FileExplorerTree';
import Editor from '@monaco-editor/react';

const ProjectFolderPicker = ({ filesMap = {}, onFilesChange, title = 'Coding Project Folder' }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [previewTab, setPreviewTab] = useState('tree'); // 'tree' or 'code'

  const fileKeys = useMemo(() => Object.keys(filesMap || {}), [filesMap]);
  const treeNodes = useMemo(() => buildFileTree(filesMap), [filesMap]);

  // Set default active preview file if none selected
  const activeFile = selectedFile && filesMap[selectedFile] !== undefined ? selectedFile : fileKeys[0] || '';

  const handleFolderSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      const parsedFilesMap = await readUploadedFolderFiles(files);
      onFilesChange(parsedFilesMap);
      const firstFile = Object.keys(parsedFilesMap)[0];
      if (firstFile) setSelectedFile(firstFile);
    } catch (err) {
      console.error('Failed to read project folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFolder = () => {
    onFilesChange({});
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 text-left shadow-xl">
      {/* Input hidden with webkitdirectory */}
      <input
        ref={fileInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Header & Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FolderTree className="h-5 w-5 text-sky-400" />
            <h4 className="text-base font-bold text-white">{title}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Select an existing project folder from your computer. Preserves folders, subfolders, files & hierarchy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {fileKeys.length > 0 && (
            <button
              type="button"
              onClick={handleClearFolder}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Folder</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
          >
            <FolderPlus className="h-4.5 w-4.5" />
            <span>📂 Open Project Folder</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-950/50 rounded-2xl border border-slate-850">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-400"></div>
          <span className="text-xs text-slate-400 font-mono">Reading project folder structure...</span>
        </div>
      )}

      {/* No folder loaded empty state */}
      {!loading && fileKeys.length === 0 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
        >
          <div className="p-4 bg-sky-500/10 rounded-2xl text-sky-400 group-hover:scale-110 transition">
            <FolderPlus className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-200">No project folder selected yet</p>
            <p className="text-xs text-slate-400">
              Click <strong className="text-sky-400">📂 Open Project Folder</strong> to choose a project directory (e.g. Employee-Management, Hospital-Management)
            </p>
          </div>
        </div>
      )}

      {/* Folder Loaded Preview Card */}
      {!loading && fileKeys.length > 0 && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Files</div>
                <div className="text-sm font-black text-white font-mono">{fileKeys.length}</div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
              <FileCode2 className="h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Code Files</div>
                <div className="text-sm font-black text-white font-mono">
                  {fileKeys.filter(f => f.match(/\.(js|jsx|html|css|json|sql|py|java|cpp|c)$/i)).length}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
              <Layers className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Subfolders</div>
                <div className="text-sm font-black text-white font-mono">
                  {new Set(fileKeys.map(f => f.includes('/') ? f.split('/')[0] : '').filter(Boolean)).size}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
              <Code className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Active File</div>
                <div className="text-xs font-bold text-white truncate max-w-[120px] font-mono">
                  {activeFile || 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive VS Code-style Directory Browser */}
          <div className="bg-[#1e1e1e] rounded-2xl border border-slate-800 overflow-hidden flex flex-col md:flex-row h-96 shadow-2xl">
            {/* Left Explorer Tree */}
            <div className="w-full md:w-64 bg-[#252526] border-r border-slate-800 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-sky-400" />
                  <span>Project Explorer</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">{fileKeys.length} items</span>
              </div>

              {/* Search filter input */}
              <div className="p-2 border-b border-slate-800 bg-[#1e1e1e]">
                <div className="flex items-center px-2 py-1 bg-[#2a2d2e] rounded border border-slate-700 text-xs">
                  <Search className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search files..."
                    className="w-full bg-transparent text-white placeholder-slate-500 outline-none text-xs font-mono"
                  />
                </div>
              </div>

              {/* File tree */}
              <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                <FileExplorerTree
                  treeNodes={treeNodes}
                  activeFile={activeFile}
                  onSelectFile={(path) => setSelectedFile(path)}
                  searchFilter={searchFilter}
                />
              </div>
            </div>

            {/* Right Editor Preview */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
              <div className="h-9 bg-[#2d2d2d] border-b border-slate-800 flex items-center justify-between px-4 text-xs font-mono text-slate-300">
                <div className="flex items-center space-x-2 truncate">
                  <Eye className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="text-white font-semibold truncate">{activeFile || 'No file selected'}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Live Preview</span>
              </div>

              <div className="flex-1 relative">
                {activeFile ? (
                  <Editor
                    height="100%"
                    path={activeFile}
                    value={filesMap[activeFile] || ''}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    Select a file from the explorer to preview its contents
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFolderPicker;

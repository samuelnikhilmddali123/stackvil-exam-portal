import React, { useState, useMemo } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import JSZip from 'jszip';
import { 
  FolderTree, 
  Download, 
  Eye, 
  GitCompare, 
  CheckCircle2, 
  FileCode2, 
  Sparkles,
  Search,
  ChevronRight
} from 'lucide-react';
import { buildFileTree, getLanguageFromFilePath } from '../../utils/fileTreeUtils';
import FileExplorerTree, { getFileIcon } from './FileExplorerTree';
import toast from 'react-hot-toast';

const VSCodeDiffViewer = ({
  submittedFiles = {},
  originalFiles = {},
  candidateName = 'Candidate',
  examTitle = 'Coding Assessment'
}) => {
  const [activeFile, setActiveFile] = useState('');
  const [viewMode, setViewMode] = useState('diff'); // 'code' | 'diff'
  const [searchFilter, setSearchFilter] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fileKeys = useMemo(() => Object.keys(submittedFiles || {}), [submittedFiles]);
  const treeNodes = useMemo(() => buildFileTree(submittedFiles), [submittedFiles]);

  // Set default selected file if none active
  const currentFile = activeFile && submittedFiles[activeFile] !== undefined ? activeFile : fileKeys[0] || '';

  // Determine modified files map by comparing submitted vs original
  const modifiedFilesMap = useMemo(() => {
    const map = {};
    for (const path of fileKeys) {
      const orig = originalFiles[path] || '';
      const subm = submittedFiles[path] || '';
      if (orig !== subm) {
        map[path] = true;
      }
    }
    return map;
  }, [fileKeys, originalFiles, submittedFiles]);

  // Download complete project folder as ZIP file using JSZip
  const handleDownloadProjectZip = async () => {
    if (!fileKeys || fileKeys.length === 0) {
      toast.error('No project files to download.');
      return;
    }

    try {
      setDownloading(true);
      const zip = new JSZip();
      const folderName = `${candidateName.replace(/\s+/g, '_')}_Project_Submission`;
      const rootFolder = zip.folder(folderName);

      for (const [filePath, content] of Object.entries(submittedFiles)) {
        rootFolder.file(filePath, content || '');
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Downloaded complete project zip!');
    } catch (err) {
      console.error('Failed to generate project zip:', err);
      toast.error('Failed to download project zip.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-[#1e1e1e] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[700px] text-left">
      
      {/* 1. ADMIN REVIEW HEADER BAR */}
      <div className="h-14 bg-[#3c3c3c] border-b border-[#252526] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 bg-sky-600/30 border border-sky-500/30 rounded-lg text-sky-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>VS Code Submitted Project Review</span>
          </div>
          <span className="h-4 w-px bg-slate-600"></span>
          <span className="font-bold text-sm text-white truncate max-w-xs">{candidateName}'s Submission</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mode Toggles */}
          <div className="flex items-center bg-[#252526] p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center space-x-1.5 transition ${
                viewMode === 'code'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Candidate Code</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center space-x-1.5 transition ${
                viewMode === 'diff'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Diff vs Original</span>
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownloadProjectZip}
            disabled={downloading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Zipping...' : 'Download Complete Project'}</span>
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* LEFT FILE EXPLORER SIDEBAR */}
        <div className="w-64 bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1e1e1e] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
              <FolderTree className="h-3.5 w-3.5 text-sky-400" />
              <span>Project Structure</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {Object.keys(modifiedFilesMap).length} edited
            </span>
          </div>

          {/* Search filter */}
          <div className="p-2 border-b border-[#1e1e1e] bg-[#1e1e1e]">
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

          {/* File Explorer Tree */}
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            <FileExplorerTree
              treeNodes={treeNodes}
              activeFile={currentFile}
              onSelectFile={(path) => setActiveFile(path)}
              modifiedFiles={modifiedFilesMap}
              searchFilter={searchFilter}
            />
          </div>
        </div>

        {/* RIGHT MONACO EDITOR / DIFF VIEWER */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
          {/* Header tab indicator */}
          <div className="h-9 bg-[#2d2d2d] border-b border-[#1e1e1e] flex items-center justify-between px-4 text-xs font-mono text-slate-300">
            <div className="flex items-center space-x-2 truncate">
              {getFileIcon(currentFile)}
              <span className="text-white font-bold truncate">{currentFile || 'No file selected'}</span>
              {modifiedFilesMap[currentFile] && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold uppercase">
                  Modified by candidate
                </span>
              )}
            </div>

            <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">
              {viewMode === 'diff' ? 'Side-by-Side Diff (Original vs Submitted)' : 'Candidate Code'}
            </span>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {currentFile ? (
              viewMode === 'diff' ? (
                <DiffEditor
                  height="100%"
                  original={originalFiles[currentFile] || ''}
                  modified={submittedFiles[currentFile] || ''}
                  language={getLanguageFromFilePath(currentFile)}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              ) : (
                <Editor
                  height="100%"
                  path={currentFile}
                  language={getLanguageFromFilePath(currentFile)}
                  value={submittedFiles[currentFile] || ''}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Select a file from the explorer to view code or diff
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VSCodeDiffViewer;

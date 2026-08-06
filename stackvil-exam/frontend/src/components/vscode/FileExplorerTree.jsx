import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  FileType, 
  Database,
  Code2,
  File
} from 'lucide-react';

/**
 * Renders appropriate Lucide icon based on file extension
 */
export const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return <Code2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />;
    case 'css':
    case 'scss':
      return <FileType className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
    case 'ts':
    case 'tsx':
      return <FileCode className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
    case 'json':
      return <FileJson className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
    case 'sql':
      return <Database className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
    case 'md':
      return <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />;
    default:
      return <File className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
  }
};

const TreeNode = ({ node, level = 0, activeFile, onSelectFile, modifiedFiles = {}, searchFilter = '' }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isFolder) {
    // If search filter exists, check if any child matches
    const hasMatchingChild = (n) => {
      if (!searchFilter) return true;
      if (n.name.toLowerCase().includes(searchFilter.toLowerCase())) return true;
      if (n.children) return n.children.some(hasMatchingChild);
      return false;
    };

    if (searchFilter && !hasMatchingChild(node)) {
      return null;
    }

    return (
      <div className="select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${level * 12 + 6}px` }}
          className="w-full flex items-center space-x-1.5 py-1 px-2 text-xs font-semibold text-slate-300 hover:bg-[#2a2d2e] hover:text-white rounded transition text-left group"
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-white shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          )}
          <span className="truncate text-[11px] tracking-wide">{node.name}</span>
        </button>

        {isOpen && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                level={level + 1}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                modifiedFiles={modifiedFiles}
                searchFilter={searchFilter}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File Node
  if (searchFilter && !node.name.toLowerCase().includes(searchFilter.toLowerCase()) && !node.path.toLowerCase().includes(searchFilter.toLowerCase())) {
    return null;
  }

  const isActive = activeFile === node.path;
  const isModified = modifiedFiles[node.path];

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${level * 12 + 18}px` }}
      className={`w-full flex items-center justify-between py-1 px-2 text-xs rounded transition text-left select-none ${
        isActive
          ? 'bg-[#37373d] text-white font-bold border-l-2 border-sky-400'
          : 'text-slate-300 hover:bg-[#2a2d2e] hover:text-white'
      }`}
    >
      <div className="flex items-center space-x-1.5 min-w-0">
        {getFileIcon(node.name)}
        <span className="truncate text-[11px] font-mono">{node.name}</span>
      </div>
      {isModified && (
        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Unsaved edits" />
      )}
    </button>
  );
};

const FileExplorerTree = ({ treeNodes = [], activeFile, onSelectFile, modifiedFiles = {}, searchFilter = '' }) => {
  if (!treeNodes || treeNodes.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 font-mono">
        No files in project folder.
      </div>
    );
  }

  return (
    <div className="flex flex-col py-1 space-y-0.5">
      {treeNodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          level={0}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
          modifiedFiles={modifiedFiles}
          searchFilter={searchFilter}
        />
      ))}
    </div>
  );
};

export default FileExplorerTree;

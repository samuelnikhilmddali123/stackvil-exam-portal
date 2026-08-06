/**
 * Utility functions for building and parsing folder structures in VS Code workspace
 */

/**
 * Builds a hierarchical tree node structure from a key-value map of file paths to content.
 * e.g., { "frontend/index.html": "...", "backend/server.js": "..." }
 */
export const buildFileTree = (filesMap = {}) => {
  const root = [];

  const findOrCreateFolder = (parentArray, folderName, folderPath) => {
    let folder = parentArray.find((item) => item.isFolder && item.name === folderName);
    if (!folder) {
      folder = {
        name: folderName,
        path: folderPath,
        isFolder: true,
        children: [],
      };
      parentArray.push(folder);
    }
    return folder;
  };

  const filePaths = Object.keys(filesMap || {}).sort();

  for (const filePath of filePaths) {
    if (!filePath || filePath.endsWith('/')) continue;

    const parts = filePath.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (i === parts.length - 1) {
        // It's a file
        currentLevel.push({
          name: part,
          path: filePath,
          isFolder: false,
        });
      } else {
        // It's a folder
        const folderNode = findOrCreateFolder(currentLevel, part, currentPath);
        currentLevel = folderNode.children;
      }
    }
  }

  // Sort folders first, then files alphabetically
  const sortTreeNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) {
      if (node.isFolder && node.children) {
        sortTreeNodes(node.children);
      }
    }
  };

  sortTreeNodes(root);
  return root;
};

/**
 * Helper to determine language mode for Monaco Editor based on file extension
 */
export const getLanguageFromFilePath = (filePath = '') => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'json':
      return 'json';
    case 'sql':
      return 'sql';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'env':
    case 'gitignore':
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'sh':
    case 'bash':
      return 'shell';
    default:
      return 'plaintext';
  }
};

/**
 * Reads an uploaded HTML5 FileList (from webkitdirectory input) into a filesMap object
 */
export const readUploadedFolderFiles = async (fileList) => {
  const filesMap = {};
  const filesArray = Array.from(fileList);

  // Determine top folder name if any
  let rootPrefix = '';
  if (filesArray.length > 0 && filesArray[0].webkitRelativePath) {
    const firstRelPath = filesArray[0].webkitRelativePath;
    const parts = firstRelPath.split('/');
    if (parts.length > 1) {
      rootPrefix = parts[0] + '/';
    }
  }

  const readSingleFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      let relPath = file.webkitRelativePath || file.name;
      if (rootPrefix && relPath.startsWith(rootPrefix)) {
        relPath = relPath.substring(rootPrefix.length);
      }

      // Ignore node_modules or binary images/git files if unnecessary, but preserve code files
      if (relPath.includes('node_modules/') || relPath.includes('.git/')) {
        return resolve(null);
      }

      reader.onload = (e) => {
        resolve({ path: relPath, content: e.target?.result || '' });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });
  };

  const results = await Promise.all(filesArray.map(readSingleFile));
  for (const item of results) {
    if (item && item.path) {
      filesMap[item.path] = item.content;
    }
  }

  return filesMap;
};

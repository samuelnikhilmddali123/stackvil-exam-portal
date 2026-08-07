import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FolderCheck, 
  Clock, 
  Upload, 
  FileArchive, 
  Folder, 
  Play, 
  ExternalLink,
  ShieldCheck,
  Send,
  FileCode,
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProctorScreenShare from '../ProctorScreenShare';

const Round3VSCodeView = ({
  files = {},
  examTitle = 'Coding Assessment',
  durationMinutes = 60,
  timeLeftSeconds = 3600,
  isSubmitting = false,
  onSubmitProject,
  proctorComponent,
  examId
}) => {
  // Checklist states for starting coding round timer
  const [cameraActive, setCameraActive] = useState(true); // From ProctorCamera
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [projectOpened, setProjectOpened] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);

  // Submission state (dual folder & zip upload)
  const [submittedFiles, setSubmittedFiles] = useState({});
  const [uploadMode, setUploadMode] = useState('folder'); // 'folder' | 'zip'
  const [uploading, setUploading] = useState(false);
  const [submittedFileName, setSubmittedFileName] = useState('');

  const screenShareRef = useRef(null);

  // All 3 conditions met?
  const allConditionsMet = cameraActive && screenShareActive && projectOpened;

  // Handle starter project download (.zip)
  const handleDownloadStarterProject = async () => {
    try {
      toast.loading('Generating starter project zip...', { id: 'zipGen' });
      const zip = new JSZip();

      // Default files if not supplied
      const targetFiles = (files && Object.keys(files).length > 0) ? files : {
        'frontend/index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>Employee Management</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Employee Directory</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
        'frontend/style.css': 'body { font-family: sans-serif; background: #0f172a; color: white; padding: 20px; }',
        'frontend/script.js': 'console.log("Employee Management Frontend");',
        'backend/server.js': 'const express = require("express");\nconst app = express();\napp.listen(3000, () => console.log("Server port 3000"));',
        'backend/routes.js': 'const express = require("express");\nconst router = express.Router();\nmodule.exports = router;',
        'backend/controller.js': '// TODO: Implement GET, POST, PUT, DELETE employee handlers',
        'backend/model.js': '// Employee Schema model',
        'backend/package.json': '{\n  "name": "employee-backend",\n  "version": "1.0.0",\n  "main": "server.js"\n}',
        'backend/schema.sql': '-- CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), department VARCHAR(50), salary DECIMAL(10,2));',
        'README.md': '# Employee Management Starter Project\n\n1. Install dependencies in backend using `npm install`.\n2. Open project folder in Visual Studio Code.\n3. Complete the CRUD APIs and frontend integration.'
      };

      // Add files to Zip archive
      Object.entries(targetFiles).forEach(([filePath, content]) => {
        zip.file(filePath, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${examTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-starter-project.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadedZip(true);
      toast.success('Starter project ZIP downloaded successfully!', { id: 'zipGen' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate project ZIP download.', { id: 'zipGen' });
    }
  };

  // Handle folder upload input change (webkitdirectory)
  const handleFolderUpload = async (e) => {
    const uploadedFileList = e.target.files;
    if (!uploadedFileList || uploadedFileList.length === 0) return;

    try {
      setUploading(true);
      const parsedFiles = {};
      let firstFolderName = '';

      for (let i = 0; i < uploadedFileList.length; i++) {
        const file = uploadedFileList[i];
        const fullPath = file.webkitRelativePath || file.name;
        
        // Skip node_modules or .git binary files to optimize speed
        if (fullPath.includes('node_modules') || fullPath.includes('.git')) continue;

        if (!firstFolderName && fullPath.includes('/')) {
          firstFolderName = fullPath.split('/')[0];
        }

        // Remove top-level folder prefix for clean relative paths
        const cleanPath = fullPath.replace(/^[^\/]+\//, '');
        const textContent = await file.text();
        parsedFiles[cleanPath] = textContent;
      }

      setSubmittedFiles(parsedFiles);
      setSubmittedFileName(firstFolderName || `${uploadedFileList.length} files selected`);
      toast.success(`Loaded project folder (${Object.keys(parsedFiles).length} code files parsed)`);
    } catch (err) {
      console.error('Folder parse error:', err);
      toast.error('Failed to parse uploaded project folder structure.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Zip upload input change
  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const zip = await JSZip.loadAsync(file);
      const parsedFiles = {};

      for (const [filename, fileObj] of Object.entries(zip.files)) {
        if (!fileObj.dir && !filename.includes('node_modules') && !filename.includes('.git')) {
          const text = await fileObj.async('string');
          // Clean top level directory prefix if present
          const cleanPath = filename.replace(/^[^\/]+\//, '');
          parsedFiles[cleanPath || filename] = text;
        }
      }

      setSubmittedFiles(parsedFiles);
      setSubmittedFileName(file.name);
      toast.success(`ZIP project archive parsed successfully (${Object.keys(parsedFiles).length} files)`);
    } catch (err) {
      console.error('Zip extract error:', err);
      toast.error('Failed to extract uploaded project ZIP file.');
    } finally {
      setUploading(false);
    }
  };

  const handleFinalSubmission = () => {
    const activePayload = Object.keys(submittedFiles).length > 0 ? submittedFiles : files;
    if (Object.keys(activePayload).length === 0) {
      toast.error('Please upload your completed project files before submitting.');
      return;
    }
    onSubmitProject(activePayload);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col overflow-y-auto">
      
      {/* Header Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
            <FileCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-black text-base text-white">{examTitle}</h1>
            <p className="text-xs text-slate-400 font-medium">Round 3 - Local VS Code Assessment</p>
          </div>
        </div>

        {/* Live Coding Timer Badge */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold transition ${
            allConditionsMet 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' 
              : 'bg-slate-800/80 border-slate-700 text-slate-400'
          }`}>
            <Clock className="h-4 w-4" />
            <span>{allConditionsMet ? formatTime(timeLeftSeconds) : 'Timer Paused'}</span>
          </div>

          <button
            onClick={handleFinalSubmission}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>{isSubmitting ? 'Submitting Project...' : 'Submit Completed Project'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Instructions & 3-Condition Requirements Tracker */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Alert Banner */}
          {!allConditionsMet ? (
            <div className="p-5 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Coding Timer is Paused</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                The official 60-minute coding timer will start <strong>only after</strong> all setup requirements are completed below.
              </p>
            </div>
          ) : (
            <div className="p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-300">Assessment Active (Tab/Window Switching Enabled)</h3>
                  <p className="text-xs text-emerald-200/80">Proctoring camera & screen share active. You may now switch between File Explorer, VS Code, and browser.</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                Timer Running
              </span>
            </div>
          )}

          {/* Detailed Step-by-Step Instructions Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Play className="h-5 w-5 text-emerald-400" />
              <span>Round 3 Workflow Instructions</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 1: Camera Setup</div>
                <p className="text-slate-400 text-[11px]">Keep your webcam stream ON throughout the entire coding round.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 2: Share Entire Screen</div>
                <p className="text-slate-400 text-[11px]">Click "Share Entire Screen". Select <strong>Entire Screen</strong> (single tabs/windows prohibited).</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 3: Download ZIP Archive</div>
                <p className="text-slate-400 text-[11px]">Click "Download Starter Project (.zip)" to download code files.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 4: Extract & Open in VS Code</div>
                <p className="text-slate-400 text-[11px]">Open File Explorer, extract ZIP, and open folder in Visual Studio Code. *(Window/tab switching is allowed)*.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 5: Confirm Project Opened</div>
                <p className="text-slate-400 text-[11px]">Click "I Have Opened the Project" to start your official 60-minute countdown timer.</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <div className="font-bold text-brand-400">Step 6: Submit Completed Code</div>
                <p className="text-slate-400 text-[11px]">Upload your completed project folder or ZIP archive back to portal and submit.</p>
              </div>
            </div>
          </div>

          {/* 3-Step Setup Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-brand-400" />
              <span>Assessment Readiness Checklist</span>
            </h2>

            <div className="space-y-4">
              
              {/* Step 1: Camera Stream */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                cameraActive ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    cameraActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Live Proctoring Camera</h4>
                    <p className="text-[11px] text-slate-400">Webcam must remain active throughout Round 3</p>
                  </div>
                </div>
                {cameraActive ? (
                  <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Camera ON</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400">Camera Disconnected</span>
                )}
              </div>

              {/* Step 2: Screen Sharing */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                screenShareActive ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    screenShareActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Entire Screen Sharing</h4>
                    <p className="text-[11px] text-slate-400">Must share Entire Screen (browser tabs or windows prohibited)</p>
                  </div>
                </div>
                {screenShareActive ? (
                  <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Entire Screen Active</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">Pending Share</span>
                )}
              </div>

              {/* Step 3: Starter Project & Manual Open */}
              <div className={`p-4 rounded-2xl border space-y-3 transition ${
                projectOpened ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      projectOpened ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Download & Open Project in VS Code</h4>
                      <p className="text-[11px] text-slate-400">Download starter archive, open in local VS Code, then confirm</p>
                    </div>
                  </div>
                  {projectOpened && (
                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Project Opened</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleDownloadStarterProject}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-brand-400" />
                    <span>Download Starter Project (.zip)</span>
                  </button>

                  <button
                    onClick={() => {
                      setProjectOpened(true);
                      toast.success('Project opening confirmed. Coding timer started!');
                    }}
                    disabled={projectOpened}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 cursor-pointer ${
                      projectOpened 
                        ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-default' 
                        : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md'
                    }`}
                  >
                    <FolderCheck className="h-4 w-4" />
                    <span>{projectOpened ? 'Confirmed Project Opened' : 'I Have Opened the Project'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Project Structure Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white">Starter Project Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Open the downloaded project folder in your Visual Studio Code. Edit files directly in VS Code.
            </p>
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl font-mono text-xs text-slate-300 space-y-1">
              <div>📁 Employee Management</div>
              <div className="pl-4 text-sky-400">├── 📁 frontend/</div>
              <div className="pl-8 text-slate-400">├── index.html</div>
              <div className="pl-8 text-slate-400">├── style.css</div>
              <div className="pl-8 text-slate-400">└── script.js</div>
              <div className="pl-4 text-emerald-400">├── 📁 backend/</div>
              <div className="pl-8 text-slate-400">├── server.js</div>
              <div className="pl-8 text-slate-400">├── routes.js</div>
              <div className="pl-8 text-slate-400">├── controller.js</div>
              <div className="pl-8 text-slate-400">├── model.js</div>
              <div className="pl-8 text-slate-400">├── package.json</div>
              <div className="pl-8 text-slate-400">└── schema.sql</div>
              <div className="pl-4 text-amber-400">└── README.md</div>
            </div>
          </div>

          {/* Submission Section: Dual Folder & ZIP Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Upload className="h-5 w-5 text-emerald-400" />
                <span>Submit Completed Project</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload your completed project via Folder selection or ZIP archive. Relative folder directory paths will be preserved for admin review.
              </p>
            </div>

            {/* Toggle Mode Buttons */}
            <div className="flex space-x-3 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => setUploadMode('folder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  uploadMode === 'folder' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Select Folder</span>
              </button>
              <button
                onClick={() => setUploadMode('zip')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  uploadMode === 'zip' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileArchive className="h-3.5 w-3.5" />
                <span>Upload ZIP File</span>
              </button>
            </div>

            {/* Upload Box */}
            <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/70 bg-slate-950/60 rounded-2xl p-6 text-center space-y-3 transition">
              {uploading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mx-auto" />
                  <p className="text-xs text-slate-400">Parsing project directory structure...</p>
                </div>
              ) : submittedFileName ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">{submittedFileName}</p>
                  <p className="text-xs text-emerald-400">
                    {Object.keys(submittedFiles).length} project code files ready for submission
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-10 w-10 text-slate-500 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      {uploadMode === 'folder' ? 'Click to select project directory folder' : 'Click to select project .ZIP archive'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Preserves nested frontend/ and backend/ directory structure</p>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              {uploadMode === 'folder' ? (
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  onChange={handleFolderUpload}
                  className="hidden"
                  id="folderInput"
                />
              ) : (
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                  id="zipInput"
                />
              )}

              <label
                htmlFor={uploadMode === 'folder' ? 'folderInput' : 'zipInput'}
                className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition"
              >
                {uploadMode === 'folder' ? 'Browse Project Directory' : 'Select ZIP Archive'}
              </label>
            </div>

            <button
              onClick={handleFinalSubmission}
              disabled={isSubmitting || Object.keys(submittedFiles).length === 0}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Finalize & Submit Round 3 Assessment</span>
            </button>

          </div>

        </div>

        {/* Right 1 Column: Live Proctor Camera & Screen Share Feeds */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Live Proctor Monitor</h3>
            <p className="text-xs text-slate-400">Webcam feed and screen share stream are monitored by admin in real-time.</p>
          </div>

          {/* Embedded Proctor Camera */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3">
            {proctorComponent}
          </div>

          {/* Embedded Proctor Screen Share */}
          <ProctorScreenShare
            ref={screenShareRef}
            examId={examId}
            onScreenShareStateChange={(sharing, isEntire) => {
              setScreenShareActive(sharing && isEntire);
            }}
          />
        </div>

      </div>

    </div>
  );
};

export default Round3VSCodeView;

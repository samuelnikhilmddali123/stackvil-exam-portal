const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/images', 'uploads/documents', 'uploads/proctor'];
uploadDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    
    // Categorize files based on fieldName or file extension
    if (file.fieldname === 'proctorImage' || file.fieldname === 'image') {
      if (file.fieldname === 'proctorImage') {
        dest = 'uploads/proctor/';
      } else {
        dest = 'uploads/images/';
      }
    } else if (
      file.fieldname === 'excel' || 
      file.fieldname === 'pdf' || 
      file.fieldname === 'file' ||
      file.fieldname === 'aptitudePdf' ||
      file.fieldname === 'technicalPdf'
    ) {
      dest = 'uploads/documents/';
    }
    
    cb(null, path.join(__dirname, '..', dest));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter (Only allow images, PDFs, and Excels)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${ext}. Supported types: Images, PDFs, and Excels.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = upload;

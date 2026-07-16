import multer from 'multer';

const storage = multer.memoryStorage();

// Strict list of allowed MIME types and extensions
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'docx', 'xlsx', 'txt'];

const fileFilter = (req, file, cb) => {
  const ext = file.originalname ? file.originalname.toLowerCase().split('.').pop() : '';
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type or extension. Only JPEG, PNG, WEBP, GIF, PDF, DOCX, XLSX, and TXT are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter
});

/**
 * Scan buffer for executable headers and script injections.
 */
const scanForMaliciousContent = (buffer) => {
  const hexHeader = buffer.toString('hex', 0, 2).toLowerCase();
  
  // Reject MZ (DOS/PE executable) header
  if (hexHeader === '4d5a') {
    return 'DOS/PE Executable file type (MZ header) detected.';
  }
  
  const contentStr = buffer.toString('utf8').toLowerCase();
  const maliciousPatterns = [
    '<?php',
    '<? ',
    '<%',
    '<script',
    'javascript:',
    'onload=',
    'onerror=',
    'eval(',
    'exec('
  ];
  
  for (const pattern of maliciousPatterns) {
    if (contentStr.includes(pattern)) {
      return `Executable script sequence '${pattern}' detected.`;
    }
  }
  
  return null;
};

/**
 * Validate magic numbers match the declared MIME type.
 */
const checkMagicNumbers = (buffer, mimetype) => {
  if (buffer.length < 4) return false;
  const hex = buffer.toString('hex', 0, 4).toLowerCase();
  
  if (mimetype === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mimetype === 'image/png') return hex.startsWith('89504e47');
  if (mimetype === 'image/gif') return hex.startsWith('47494638');
  if (mimetype === 'application/pdf') return hex.startsWith('25504446');
  if (mimetype === 'image/webp') {
    const isRiff = hex.startsWith('52494646');
    const isWebp = buffer.toString('hex', 8, 12).toLowerCase() === '57454250';
    return isRiff && isWebp;
  }
  if (mimetype.includes('officedocument')) return hex.startsWith('504b0304');
  if (mimetype === 'text/plain') return true;
  
  return false;
};

/**
 * Post-upload validation middleware to scan the file buffer.
 */
export const validateUploadedFile = (req, res, next) => {
  const file = req.file;
  if (!file) {
    return next();
  }
  
  const { buffer, mimetype, originalname } = file;
  const ext = originalname ? originalname.toLowerCase().split('.').pop() : '';
  
  // 1. Context-specific checks based on endpoints
  const isProfileImage = req.path.includes('profile') || req.baseUrl.includes('user') || file.fieldname === 'profileImage';
  const isReport = req.baseUrl.includes('employee-reports') || file.fieldname === 'pdfFile';
  
  if (isProfileImage) {
    const allowedImageMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedImageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowedImageMime.includes(mimetype) || !allowedImageExt.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Upload rejected: Profile image must be a valid image file (JPEG, PNG, WEBP, GIF).'
      });
    }
  }
  
  if (isReport) {
    const allowedReportMime = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedReportExt = ['pdf', 'docx'];
    if (!allowedReportMime.includes(mimetype) || !allowedReportExt.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Upload rejected: Reports must be valid PDF or DOCX documents.'
      });
    }
  }
  
  // 2. Scan file content buffer for malicious script patterns and PE executable MZ header
  const scanError = scanForMaliciousContent(buffer);
  if (scanError) {
    return res.status(400).json({
      success: false,
      message: `Upload rejected: Malicious content detected. ${scanError}`
    });
  }
  
  // 3. Verify file signature / magic numbers matches mimetype
  const isSignatureValid = checkMagicNumbers(buffer, mimetype);
  if (!isSignatureValid) {
    return res.status(400).json({
      success: false,
      message: 'Upload rejected: File content signature (magic numbers) does not match declared file extension.'
    });
  }
  
  next();
};

export { upload };
export default upload;

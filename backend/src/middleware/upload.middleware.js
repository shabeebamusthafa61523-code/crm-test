// ── src/middleware/upload.middleware.js ──
import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const ext = file.originalname ? file.originalname.toLowerCase().split('.').pop() : '';
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];

  if (
    allowedMimeTypes.includes(file.mimetype) || 
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter
});

export default upload;

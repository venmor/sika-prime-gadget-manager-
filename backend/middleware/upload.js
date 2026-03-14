/*
 * File upload middleware using Multer.
 *
 * This module configures Multer to store uploaded images to the
 * `frontend/public/uploads` directory. The filenames are prefixed with
 * a timestamp to avoid collisions. Only image files are accepted.
 */

const path = require('path');
const multer = require('multer');

// Define storage configuration for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Resolve to the uploads folder within frontend/public
    const uploadPath = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Prefix the original filename with a timestamp to ensure uniqueness
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${timestamp}${ext}`);
  }
});

// File filter to accept only images (optional but recommended)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Export the configured Multer instance
const upload = multer({
  storage,
  fileFilter
});

module.exports = upload;
import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/img/uploaded');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP, SVG) are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Upload single image
router.post('/image', authenticate, upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the relative path that can be used in the frontend
    const relativePath = `/img/uploaded/${req.file.filename}`;
    
    logger.info(`Image uploaded: ${req.file.filename}`);
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: relativePath,
      filename: req.file.filename,
    });
  } catch (error: any) {
    logger.error('[upload] Error uploading image:', error);
    res.status(500).json({ message: error.message || 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', authenticate, upload.array('images', 10), (req: Request, res: Response) => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const imageUrls = files.map(file => ({
      imageUrl: `/img/uploaded/${file.filename}`,
      filename: file.filename,
    }));
    
    logger.info(`Multiple images uploaded: ${files.length} files`);
    
    res.json({
      message: 'Images uploaded successfully',
      images: imageUrls,
    });
  } catch (error: any) {
    logger.error('[upload] Error uploading images:', error);
    res.status(500).json({ message: error.message || 'Failed to upload images' });
  }
});

// Delete uploaded image
router.delete('/image/:filename', authenticate, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    fs.unlinkSync(filePath);
    logger.info(`Image deleted: ${filename}`);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    logger.error('[upload] Error deleting image:', error);
    res.status(500).json({ message: error.message || 'Failed to delete image' });
  }
});

export default router;


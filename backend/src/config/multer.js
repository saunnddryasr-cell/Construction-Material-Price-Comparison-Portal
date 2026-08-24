const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed'));
  }
};

// Storage configuration
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, `uploads/${destination}`);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
};

// Multer instances
const uploadMaterial = multer({
  storage: createStorage('materials'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

const uploadProfile = multer({
  storage: createStorage('profiles'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter,
});

const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

// Single file upload
const uploadSingle = (fieldName, type = 'material') => {
  const uploaders = {
    material: uploadMaterial,
    profile: uploadProfile,
    document: uploadDocument,
  };
  return uploaders[type].single(fieldName);
};

// Multiple file upload
const uploadMultiple = (fieldName, maxCount = 5, type = 'material') => {
  const uploaders = {
    material: uploadMaterial,
    profile: uploadProfile,
    document: uploadDocument,
  };
  return uploaders[type].array(fieldName, maxCount);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadMaterial,
  uploadProfile,
  uploadDocument,
};


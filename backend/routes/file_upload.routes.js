const express = require('express');
const router = express.Router();
const fileUploadController = require('../controllers/file_upload.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/rbac.middleware');

// Serve file through backend proxy (no auth needed for file access)
router.get('/serve/:objectName', fileUploadController.serveFile);

// Apply authentication middleware to all other routes
router.use(authMiddleware);

// Upload file
router.post('/upload', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.uploadMiddleware,
  fileUploadController.uploadFile
);

// Get files list
router.get('/files', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.getFiles
);

// Delete file
router.delete('/files/:objectName', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.deleteFile
);

// Get file URL
router.get('/files/:objectName/url', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.getFileUrl
);

// Debug endpoint
router.get('/debug/service-data', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.debugServiceData
);

// Check tenant activation status
router.get('/tenant/:tenant_id/activation', 
  checkRole(['global_admin', 'tenant_admin', 'tenant_user']), 
  fileUploadController.checkTenantActivation
);

module.exports = router; 
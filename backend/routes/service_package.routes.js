const express = require('express');
const router = express.Router();
const servicePackageController = require('../controllers/service_package.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/rbac.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a new service package (global_admin only)
router.post('/', checkRole(['global_admin']), servicePackageController.createServicePackage);

// Get all service packages (global_admin, tenant_admin, tenant_user)
router.get('/', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), servicePackageController.getAllServicePackages);

// Get a specific service package by ID (global_admin, tenant_admin, tenant_user)
router.get('/:id', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), servicePackageController.getServicePackageById);

// Update a service package (global_admin only)
router.put('/:id', checkRole(['global_admin']), servicePackageController.updateServicePackage);

// Soft-delete a service package (global_admin only)
router.delete('/:id', checkRole(['global_admin']), servicePackageController.deleteServicePackage);

// Permanently delete a service package (global_admin only)
router.delete('/:id/permanent', checkRole(['global_admin']), servicePackageController.permanentlyDeleteServicePackage);

// Get Redis cache stats (global_admin only, for debugging/monitoring)
router.get('/cache-stats', checkRole(['global_admin']), servicePackageController.getCacheStats);

module.exports = router;
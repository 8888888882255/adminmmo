const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Authentication routes
router.post('/login', controller.login);
router.post('/register', controller.register);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

// Profile management
router.get('/profile', authMiddleware, controller.getCurrentUser);
router.put('/profile', authMiddleware, controller.updateProfile);

// Change password route (move above /:id)
router.put('/change-password', authMiddleware, controller.changePassword);

// User management routes (all require authentication)
router.get('/', authMiddleware, controller.getAll);
router.get('/me', authMiddleware, controller.getCurrentUser);
router.post('/', authMiddleware, controller.create);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.delete);

// Customer management
router.get('/tenant/:tenant_id', authMiddleware, controller.getByTenant);
router.get('/role/:role', authMiddleware, controller.getByRole);
router.get('/customers', authMiddleware, controller.getCustomers);
router.get('/customers/:id', authMiddleware, controller.getCustomerById);
router.put('/customers/:id', authMiddleware, controller.updateCustomer);
router.delete('/customers/:id', authMiddleware, controller.deleteCustomer);
router.post('/customers/restore/:id', authMiddleware, controller.restoreCustomer);

// Statistics
router.get('/statistics/:tenant_id', authMiddleware, controller.getUserStatistics);
router.get('/extended-statistics/:tenant_id', authMiddleware, controller.getExtendedTenantStatistics);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getAll, getById, create, sendInvoiceEmail, paypalSuccess, createPayPalOrder, downloadInvoicePDF, paypalCancel, activatePackageForTenant, getPurchaseStats } = require('../controllers/user_purchase.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/rbac.middleware');

router.get('/', authMiddleware, checkRole(['global_admin', 'tenant_admin', 'tenant_user']), getAll);
router.get('/:id', authMiddleware, checkRole(['global_admin', 'tenant_admin', 'tenant_user']), getById);
router.post('/', authMiddleware, checkRole(['global_admin', 'tenant_admin', 'tenant_user']), create);

router.get('/stats/overview', authMiddleware, checkRole(['global_admin', 'tenant_admin', 'tenant_user']), getPurchaseStats);

router.post('/:purchase_id/activate', authMiddleware, checkRole(['global_admin', 'tenant_admin']), activatePackageForTenant);

router.get('/invoice/:purchaseId', authMiddleware, checkRole(['global_admin', 'tenant_admin', 'tenant_user']), sendInvoiceEmail);
router.get('/invoice-pdf/:purchaseId', downloadInvoicePDF);

router.post('/paypal/create', authMiddleware, createPayPalOrder); 
router.get('/paypal/success', paypalSuccess);
router.post('/paypal/success', paypalSuccess); // Giữ POST để tương thích
router.get('/paypal/cancel', paypalCancel); 

module.exports = router;
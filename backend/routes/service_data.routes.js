const express = require('express');
const router = express.Router();
const controller = require('../controllers/service_data.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole, checkTenantAccess } = require('../middleware/rbac.middleware');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authMiddleware);

// Route test đơn giản
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Service data API is working',
    user: req.user ? { user_id: req.user.user_id, role: req.user.role, tenant_id: req.user.tenant_id } : null
  });
});

// Routes thống kê (phải đặt trước routes với parameter)
router.get('/stats/tenant', checkRole(['global_admin', 'tenant_admin']), controller.getTenantStats);
router.get('/stats/user', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getUserStats);
router.get('/stats/user/:userId', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getUserStats);

// Route kiểm tra trạng thái kích hoạt tenant
router.get('/activation/check', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.checkTenantActivation);

// Route kiểm tra giới hạn sử dụng
router.post('/check-limits', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.checkUsageLimits);

// Routes cơ bản CRUD (đặt sau routes cụ thể)
router.get('/', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getAll);
router.post('/', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.create);
router.get('/:id', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getById);
router.put('/:id', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.update);
router.delete('/:id', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.delete);

module.exports = router;
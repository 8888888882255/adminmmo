const express = require('express');
const router = express.Router();
const controller = require('../controllers/category_package.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);

// Define routes for category packages
router.post('/', checkRole(['global_admin']), controller.createCategory);
router.get('/', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getAllCategories);
router.get('/:id', checkRole(['global_admin', 'tenant_admin', 'tenant_user']), controller.getCategoryById);
router.put('/:id', checkRole(['global_admin']), controller.updateCategory);
router.delete('/:id', checkRole(['global_admin']), controller.deleteCategory);

module.exports = router;
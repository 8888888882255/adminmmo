const express = require('express');
const router = express.Router();
const controller = require('../controllers/tenant_offered_package.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);

router.get('/', checkRole(['global_admin', 'tenant_admin']), controller.getAll);
router.get('/:tenantId/:packageId', checkRole(['global_admin', 'tenant_admin']), controller.getById); // Lưu ý: Composite key
router.post('/', checkRole(['global_admin', 'tenant_admin']), controller.create);
router.put('/:tenantId/:packageId', checkRole(['global_admin', 'tenant_admin']), controller.update);
router.delete('/:tenantId/:packageId', checkRole(['global_admin', 'tenant_admin']), controller.delete);

module.exports = router;
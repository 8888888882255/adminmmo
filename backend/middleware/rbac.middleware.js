const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized - No user found' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        }

        next();
    };
};

const checkTenantAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized - No user found' });
    }

    // Global admin can access all tenants
    if (req.user.role === 'global_admin') {
        return next();
    }

    // For tenant_admin and tenant_user, ensure they can only access their tenant's data
    const requestedTenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
    
    if (requestedTenantId && requestedTenantId !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Forbidden - Cannot access data from other tenants' });
    }

    // Add tenant_id to query if not present
    if (req.user.role !== 'global_admin') {
        req.tenantFilter = { tenant_id: req.user.tenant_id };
    }

    next();
};

module.exports = {
    checkRole,
    checkTenantAccess
}; 
const { Tenant, User } = require('../models');

exports.getAll = async (req, res) => {
  try {
    // Lấy tenant_id từ user đã xác thực
    const tenant_id = req.user?.tenant_id;
    
    // Nếu là super_admin hoặc global_admin, trả về tất cả tenant
    if (req.user?.role === 'global_admin') {
      const tenants = await Tenant.findAll({
        include: [
          { model: User, as: 'adminUser', attributes: ['user_id', 'email'] }
        ]
      });
      return res.status(200).json(tenants);
    }
    
    // Nếu là tenant_admin, chỉ trả về tenant của họ
    if (tenant_id) {
      const tenants = await Tenant.findAll({
        where: { tenant_id },
        include: [
          { model: User, as: 'adminUser', attributes: ['user_id', 'email'] }
        ]
      });
      return res.status(200).json(tenants);
    }
    
    // Nếu không có tenant_id, trả về mảng rỗng
    return res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id, {
      include: [
        { model: User, as: 'adminUser', attributes: ['user_id', 'email'] }
      ]
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.status(200).json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    await tenant.update(req.body);
    res.status(200).json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    await tenant.destroy();
    res.status(204).json({});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

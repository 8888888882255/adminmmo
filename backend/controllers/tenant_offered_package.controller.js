const { TenantOfferedPackage } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const records = await TenantOfferedPackage.findAll();
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { tenantId, packageId } = req.params;
    const record = await TenantOfferedPackage.findOne({
      where: { tenant_id: tenantId, package_id: packageId },
    });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const record = await TenantOfferedPackage.create(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { tenantId, packageId } = req.params;
    const record = await TenantOfferedPackage.findOne({
      where: { tenant_id: tenantId, package_id: packageId },
    });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    await record.update(req.body);
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { tenantId, packageId } = req.params;
    const record = await TenantOfferedPackage.findOne({
      where: { tenant_id: tenantId, package_id: packageId },
    });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    await record.destroy();
    res.status(204).json({});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const { ServiceData, UserPurchase, ServicePackage, User, Tenant } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Lấy tất cả service data (có filter theo tenant)
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, package_id, user_id } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    // Filter theo tenant dựa trên role của user
    if (req.user.role !== 'global_admin') {
      whereClause.tenant_id = req.user.tenant_id;
    }
    
    // Filter theo status
    if (status) {
      whereClause.status = status;
    }
    
    // Filter theo package_id
    if (package_id) {
      whereClause.package_id = package_id;
    }
    
    // Filter theo user_id
    if (user_id) {
      whereClause.user_id = user_id;
    }

    console.log('Service data query:', { whereClause, user: req.user.user_id, role: req.user.role });

    const data = await ServiceData.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role']
        },
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'description', 'file_storage_limit']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    console.log('Service data result:', { count: data.count, rows: data.rows.length });

    res.status(200).json({
      data: data.rows,
      total: data.count,
      page: parseInt(page),
      totalPages: Math.ceil(data.count / limit)
    });
  } catch (error) {
    console.error('Error getting service data:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy service data theo ID
exports.getById = async (req, res) => {
  try {
    const data = await ServiceData.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role']
        },
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'description', 'file_storage_limit']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'name']
        }
      ]
    });
    
    if (!data) {
      return res.status(404).json({ error: 'Service data not found' });
    }
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && data.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden - Cannot access data from other tenants' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error getting service data by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

// Tạo service data mới
exports.create = async (req, res) => {
  try {
    const { user_id, package_id, object_key, file_size, bandwidth_used, database_used, api_calls_used } = req.body;
    
    // Kiểm tra quyền tạo
    if (req.user.role === 'tenant_user' && req.user.user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Forbidden - Can only create data for yourself' });
    }
    
    // Kiểm tra xem user có mua package này không
    const purchase = await UserPurchase.findOne({
      where: {
        user_id: user_id,
        package_id: package_id,
        tenant_id: req.user.tenant_id || req.body.tenant_id,
        status: 'active',
        end_date: {
          [Op.or]: [
            { [Op.gt]: new Date() },
            { [Op.is]: null }
          ]
        }
      }
    });
    
    if (!purchase) {
      return res.status(400).json({ error: 'User has not purchased this package or package has expired' });
    }
    
    // Kiểm tra giới hạn storage
    const package = await ServicePackage.findByPk(package_id);
    if (package && package.file_storage_limit > 0) {
      const currentUsage = await ServiceData.sum('file_size', {
        where: {
          user_id: user_id,
          package_id: package_id,
          tenant_id: req.user.tenant_id || req.body.tenant_id,
          status: 'active'
        }
      });
      
      if ((currentUsage || 0) + parseInt(file_size || 0) > package.file_storage_limit) {
        return res.status(400).json({ 
          error: 'Storage limit exceeded',
          currentUsage: currentUsage || 0,
          limit: package.file_storage_limit,
          requested: file_size || 0
        });
      }
    }
    
    const serviceData = await ServiceData.create({
      tenant_id: req.user.tenant_id || req.body.tenant_id,
      user_id,
      package_id,
      object_key,
      file_size: file_size || 0,
      bandwidth_used: bandwidth_used || 0,
      database_used: database_used || 0,
      api_calls_used: api_calls_used || 0,
      status: 'active'
    });
    
    res.status(201).json(serviceData);
  } catch (error) {
    console.error('Error creating service data:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cập nhật service data
exports.update = async (req, res) => {
  try {
    const data = await ServiceData.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Service data not found' });
    }
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && data.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden - Cannot access data from other tenants' });
    }
    
    // Kiểm tra quyền cập nhật
    if (req.user.role === 'tenant_user' && data.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Forbidden - Can only update your own data' });
    }
    
    await data.update(req.body);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating service data:', error);
    res.status(500).json({ error: error.message });
  }
};

// Xóa service data (soft delete)
exports.delete = async (req, res) => {
  try {
    const data = await ServiceData.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Service data not found' });
    }
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && data.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden - Cannot access data from other tenants' });
    }
    
    // Kiểm tra quyền xóa
    if (req.user.role === 'tenant_user' && data.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Forbidden - Can only delete your own data' });
    }
    
    await data.update({ status: 'deleted' });
    res.status(200).json({ message: 'Service data deleted successfully' });
  } catch (error) {
    console.error('Error deleting service data:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy thống kê sử dụng dịch vụ theo tenant
exports.getTenantStats = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const stats = await ServiceData.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active'
      },
      attributes: [
        'package_id',
        [Sequelize.fn('SUM', Sequelize.col('file_size')), 'total_file_size'],
        [Sequelize.fn('SUM', Sequelize.col('bandwidth_used')), 'total_bandwidth'],
        [Sequelize.fn('SUM', Sequelize.col('database_used')), 'total_database'],
        [Sequelize.fn('SUM', Sequelize.col('api_calls_used')), 'total_api_calls'],
        [Sequelize.fn('COUNT', Sequelize.col('data_id')), 'total_records']
      ],
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit']
        }
      ],
      group: ['package_id', 'package.package_id', 'package.name', 'package.file_storage_limit']
    });
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting tenant stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy thống kê sử dụng dịch vụ theo user
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.user_id;
    const tenantId = req.user.tenant_id;
    
    // Kiểm tra quyền truy cập
    if (req.user.role === 'tenant_user' && req.user.user_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Forbidden - Can only view your own stats' });
    }
    
    const stats = await ServiceData.findAll({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        status: 'active'
      },
      attributes: [
        'package_id',
        [Sequelize.fn('SUM', Sequelize.col('file_size')), 'total_file_size'],
        [Sequelize.fn('SUM', Sequelize.col('bandwidth_used')), 'total_bandwidth'],
        [Sequelize.fn('SUM', Sequelize.col('database_used')), 'total_database'],
        [Sequelize.fn('SUM', Sequelize.col('api_calls_used')), 'total_api_calls'],
        [Sequelize.fn('COUNT', Sequelize.col('data_id')), 'total_records']
      ],
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit']
        }
      ],
      group: ['package_id', 'package.package_id', 'package.name', 'package.file_storage_limit']
    });
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Kiểm tra giới hạn sử dụng
exports.checkUsageLimits = async (req, res) => {
  try {
    const { user_id, package_id, file_size = 0 } = req.body;
    const tenantId = req.user.tenant_id;
    
    // Kiểm tra quyền truy cập
    if (req.user.role === 'tenant_user' && req.user.user_id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Forbidden - Can only check your own limits' });
    }
    
    const package = await ServicePackage.findByPk(package_id);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    const currentUsage = await ServiceData.sum('file_size', {
      where: {
        user_id: user_id,
        package_id: package_id,
        tenant_id: tenantId,
        status: 'active'
      }
    });
    
    const totalUsage = (currentUsage || 0) + parseInt(file_size);
    const isWithinLimit = package.file_storage_limit === 0 || totalUsage <= package.file_storage_limit;
    
    res.status(200).json({
      package: {
        package_id: package.package_id,
        name: package.name,
        file_storage_limit: package.file_storage_limit
      },
      usage: {
        current: currentUsage || 0,
        requested: parseInt(file_size),
        total: totalUsage,
        remaining: package.file_storage_limit > 0 ? package.file_storage_limit - totalUsage : -1
      },
      isWithinLimit
    });
  } catch (error) {
    console.error('Error checking usage limits:', error);
    res.status(500).json({ error: error.message });
  }
};

// Kiểm tra trạng thái kích hoạt service data của tenant
exports.checkTenantActivation = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    // Kiểm tra xem tenant có service_data active không
    const activeServiceData = await ServiceData.findOne({
      where: {
        tenant_id: tenantId,
        status: 'active'
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit', 'bandwidth_limit', 'database_limit', 'api_call_limit']
        }
      ]
    });
    
    if (!activeServiceData) {
      return res.status(200).json({
        isActivated: false,
        message: 'No active service data found for this tenant'
      });
    }
    
    // Tính tổng sử dụng của tenant
    const tenantUsage = await ServiceData.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active'
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('file_size')), 'total_file_size'],
        [Sequelize.fn('SUM', Sequelize.col('bandwidth_used')), 'total_bandwidth'],
        [Sequelize.fn('SUM', Sequelize.col('database_used')), 'total_database'],
        [Sequelize.fn('SUM', Sequelize.col('api_calls_used')), 'total_api_calls']
      ]
    });
    
    const usage = tenantUsage[0];
    
    res.status(200).json({
      isActivated: true,
      package: activeServiceData.package,
      usage: {
        file_size: parseInt(usage.dataValues.total_file_size) || 0,
        bandwidth_used: parseInt(usage.dataValues.total_bandwidth) || 0,
        database_used: parseInt(usage.dataValues.total_database) || 0,
        api_calls_used: parseInt(usage.dataValues.total_api_calls) || 0
      },
      limits: {
        file_storage_limit: activeServiceData.package.file_storage_limit,
        bandwidth_limit: activeServiceData.package.bandwidth_limit,
        database_limit: activeServiceData.package.database_limit,
        api_call_limit: activeServiceData.package.api_call_limit
      }
    });
  } catch (error) {
    console.error('Error checking tenant activation:', error);
    res.status(500).json({ error: error.message });
  }
};
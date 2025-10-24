const { ServicePackage, CategoryPackage } = require('../models');
const { body, param, query, validationResult } = require('express-validator');
const redisClient = require('../config/redisClient');

// Redis key prefixes and version
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = {
  ALL_PACKAGES: `service_packages:${CACHE_VERSION}:`,
  PACKAGE_BY_ID: `service_package:${CACHE_VERSION}:`,
};

// Cache duration (in seconds)
const CACHE_TTL = 3600; // 1 hour

// ========================= VALIDATORS =========================
const validateServicePackage = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('billing_cycle')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly', 'one-time', 'indefinite'])
    .withMessage('Billing cycle must be one of: monthly, quarterly, yearly, one-time, indefinite'),
  body('package_type')
    .notEmpty().withMessage('Package type is required')
    .isIn(['free', 'pro', 'vip_pro', 'enterprise'])
    .withMessage('Package type must be one of: free, pro, vip_pro, enterprise'),
  body('file_storage_limit')
    .optional()
    .isInt({ min: 0 }).withMessage('File storage limit must be a non-negative integer'),
  body('bandwidth_limit')
    .optional()
    .isInt({ min: 0 }).withMessage('Bandwidth limit must be a non-negative integer'),
  body('database_limit')
    .optional()
    .isInt({ min: 0 }).withMessage('Database limit must be a non-negative integer'),
  body('api_call_limit')
    .optional()
    .isInt({ min: 0 }).withMessage('API call limit must be a non-negative integer'),
  body('start_date')
    .optional({ nullable: true })
    .isDate().withMessage('Start date must be a valid date'),
  body('end_date')
    .optional({ nullable: true })
    .isDate().withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be one of: active, inactive, deleted'),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
];

const validateQueryParams = [
  query('package_type')
    .optional()
    .isIn(['free', 'pro', 'vip_pro', 'enterprise'])
    .withMessage('Package type must be one of: free, pro, vip_pro, enterprise'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be one of: active, inactive, deleted'),
  query('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array(),
    });
  }
  next();
};

// Helper function to check Redis connection
const checkRedisConnection = async () => {
  try {
    await redisClient.ping();
    return true;
  } catch (err) {
    console.error(`Redis connection error at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, err);
    return false;
  }
};

// Helper function to clear relevant caches
const clearCaches = async (packageId, packageData = {}) => {
  try {
    const isRedisConnected = await checkRedisConnection();
    if (!isRedisConnected) {
      console.warn(`Redis not connected, skipping cache clear at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      return;
    }

    // Clear specific package cache if ID is provided
    if (packageId) {
      const key = `${CACHE_PREFIX.PACKAGE_BY_ID}${packageId}`;
      const result = await redisClient.del(key);
      if (result > 0) {
        console.log(`Cleared cache for ${key} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      }
    }

    // Clear affected list caches based on package attributes
    const { package_type, status, category_id } = packageData;
    const queryCombinations = [
      [], // Clear 'all' cache
      package_type ? [`type:${package_type}`] : [],
      status ? [`status:${status}`] : [],
      category_id ? [`cat:${category_id}`] : [],
      package_type && status ? [`type:${package_type}:status:${status}`] : [],
      package_type && category_id ? [`type:${package_type}:cat:${category_id}`] : [],
      status && category_id ? [`status:${status}:cat:${category_id}`] : [],
      package_type && status && category_id ? [`type:${package_type}:status:${status}:cat:${category_id}`] : [],
    ];

    for (const params of queryCombinations) {
      const cacheKey = `${CACHE_PREFIX.ALL_PACKAGES}${params.length ? params.join(':') : 'all'}`;
      const keys = await redisClient.keys(`${cacheKey}*`);
      if (keys.length > 0) {
        const result = await redisClient.del(keys);
        if (result > 0) {
          console.log(`Cleared ${result} cache keys for pattern ${cacheKey}* at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error clearing caches at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, err);
  }
};

// ========================= CONTROLLERS =========================
exports.createServicePackage = [
  validateServicePackage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        billing_cycle,
        package_type,
        file_storage_limit,
        bandwidth_limit,
        database_limit,
        api_call_limit,
        start_date,
        end_date,
        status,
        category_id,
        created_at = new Date(),
      } = req.body;

      if (category_id) {
        const category = await CategoryPackage.findByPk(category_id);
        if (!category) {
          return res.status(400).json({ message: 'Invalid category ID' });
        }
      }

      const existingPackage = await ServicePackage.findOne({
        where: { name, package_type, category_id },
      });

      if (existingPackage) {
        return res.status(400).json({
          message: 'A service package with the same name, type, and category already exists.',
        });
      }

      const servicePackage = await ServicePackage.create({
        name,
        description,
        price,
        billing_cycle,
        package_type,
        file_storage_limit,
        bandwidth_limit: bandwidth_limit || 0,
        database_limit: database_limit || 0,
        api_call_limit: api_call_limit || 0,
        start_date,
        end_date,
        status,
        category_id,
        created_at: new Date(created_at),
      });

      // Clear relevant caches
      await clearCaches(null, { package_type, status, category_id });

      return res.status(201).json({
        message: 'Service package created successfully',
        data: servicePackage,
      });
    } catch (error) {
      console.error(`Error creating service package at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error creating service package',
        error: error.message,
      });
    }
  },
];

exports.getAllServicePackages = [
  validateQueryParams,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { package_type, status, category_id } = req.query;
      const queryParams = [
        package_type && `type:${package_type}`,
        status && `status:${status}`,
        category_id && `cat:${category_id}`,
      ].filter(Boolean).join(':');
      const cacheKey = `${CACHE_PREFIX.ALL_PACKAGES}${queryParams || 'all'}`;

      // Check Redis connection
      const isRedisConnected = await checkRedisConnection();

      if (isRedisConnected) {
        // Check cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log(`Cache hit for ${cacheKey} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
          const parsedData = JSON.parse(cachedData);
          return res.status(200).json({
            message: 'Service packages retrieved successfully from cache',
            data: Array.isArray(parsedData) ? parsedData : [],
          });
        }
      }

      // Fetch from database
      const where = {};
      if (package_type) where.package_type = package_type;
      if (status) where.status = status;
      if (category_id) where.category_id = category_id;

      const servicePackages = await ServicePackage.findAll({
        where,
        include: [{ model: CategoryPackage, as: 'category' }],
        order: [['created_at', 'DESC']],
      });

      // Store in cache if Redis is connected
      if (isRedisConnected) {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(servicePackages));
        console.log(`Cache set for ${cacheKey} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })} with ${servicePackages.length} items`);
      }

      return res.status(200).json({
        message: 'Service packages retrieved successfully',
        data: servicePackages,
      });
    } catch (error) {
      console.error(`Error retrieving service packages at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error retrieving service packages',
        error: error.message,
      });
    }
  },
];

exports.getServicePackageById = [
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `${CACHE_PREFIX.PACKAGE_BY_ID}${id}`;

      // Check Redis connection
      const isRedisConnected = await checkRedisConnection();

      if (isRedisConnected) {
        // Check cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log(`Cache hit for ${cacheKey} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
          const parsedData = JSON.parse(cachedData);
          return res.status(200).json({
            message: 'Service package retrieved successfully from cache',
            data: parsedData,
          });
        }
      }

      // Fetch from database
      const servicePackage = await ServicePackage.findByPk(id, {
        include: [{ model: CategoryPackage, as: 'category' }],
      });

      if (!servicePackage) {
        return res.status(404).json({ message: 'Service package not found' });
      }

      // Store in cache if Redis is connected
      if (isRedisConnected) {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(servicePackage));
        console.log(`Cache set for ${cacheKey} at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      }

      return res.status(200).json({
        message: 'Service package retrieved successfully',
        data: servicePackage,
      });
    } catch (error) {
      console.error(`Error retrieving service package at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error retrieving service package',
        error: error.message,
      });
    }
  },
];

exports.updateServicePackage = [
  validateId,
  validateServicePackage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        billing_cycle,
        package_type,
        file_storage_limit,
        bandwidth_limit,
        database_limit,
        api_call_limit,
        start_date,
        end_date,
        status,
        category_id,
      } = req.body;

      const servicePackage = await ServicePackage.findByPk(id);

      if (!servicePackage) {
        return res.status(404).json({ message: 'Service package not found' });
      }

      if (category_id) {
        const category = await CategoryPackage.findByPk(category_id);
        if (!category) {
          return res.status(400).json({ message: 'Invalid category ID' });
        }
      }

      // Store old attributes for cache clearing
      const oldAttributes = {
        package_type: servicePackage.package_type,
        status: servicePackage.status,
        category_id: servicePackage.category_id,
      };

      await servicePackage.update({
        name,
        description,
        price,
        billing_cycle,
        package_type,
        file_storage_limit,
        bandwidth_limit: bandwidth_limit || 0,
        database_limit: database_limit || 0,
        api_call_limit: api_call_limit || 0,
        start_date,
        end_date,
        status,
        category_id,
      });

      // Clear relevant caches (both old and new attributes)
      await clearCaches(id, oldAttributes);
      await clearCaches(id, { package_type, status, category_id });

      return res.status(200).json({
        message: 'Service package updated successfully',
        data: servicePackage,
      });
    } catch (error) {
      console.error(`Error updating service package at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error updating service package',
        error: error.message,
      });
    }
  },
];

exports.deleteServicePackage = [
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const servicePackage = await ServicePackage.findByPk(id);
      if (!servicePackage) {
        return res.status(404).json({ message: 'Service package not found' });
      }

      // Store attributes for cache clearing
      const packageData = {
        package_type: servicePackage.package_type,
        status: servicePackage.status,
        category_id: servicePackage.category_id,
      };

      await servicePackage.update({ status: 'deleted' });

      // Clear relevant caches
      await clearCaches(id, packageData);

      return res.status(200).json({ message: 'Service package deleted successfully' });
    } catch (error) {
      console.error(`Error deleting service package at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error deleting service package',
        error: error.message,
      });
    }
  },
];

exports.permanentlyDeleteServicePackage = [
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const servicePackage = await ServicePackage.findByPk(id);
      if (!servicePackage) {
        return res.status(404).json({ message: 'Service package not found' });
      }

      // Store attributes for cache clearing
      const packageData = {
        package_type: servicePackage.package_type,
        status: servicePackage.status,
        category_id: servicePackage.category_id,
      };

      await servicePackage.destroy();

      // Clear relevant caches
      await clearCaches(id, packageData);

      return res.status(200).json({ message: 'Service package permanently deleted successfully' });
    } catch (error) {
      console.error(`Error permanently deleting service package at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error permanently deleting service package',
        error: error.message,
      });
    }
  },
];

exports.getCacheStats = [
  async (req, res) => {
    try {
      const isRedisConnected = await checkRedisConnection();
      if (!isRedisConnected) {
        return res.status(500).json({ message: 'Redis connection unavailable' });
      }

      const info = await redisClient.info('stats');
      return res.status(200).json({
        message: 'Redis cache stats retrieved successfully',
        data: info,
      });
    } catch (error) {
      console.error(`Error retrieving cache stats at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}:`, error);
      return res.status(500).json({
        message: 'Error retrieving cache stats',
        error: error.message,
      });
    }
  },
];
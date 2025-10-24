const { CategoryPackage } = require('../models');
const { Sequelize } = require('sequelize');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware for create and update
const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
   body('description')
    .optional({ nullable: true }) // <-- cho phép null và không truyền
    .isString()
    .withMessage('Description must be a string'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be one of: active, inactive, deleted'),
  body('parent_id')
    .optional({ nullable: true }) // <-- cho phép null và không truyền
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer')
    .custom(async (value, { req }) => {
      if (value) {
        const parentCategory = await CategoryPackage.findByPk(value);
        if (!parentCategory) {
          throw new Error('Parent category does not exist');
        }

        // Prevent circular reference
        let currentId = value;
        const currentCategoryId = req.body.category_id || parseInt(req.params.id);

        while (currentId) {
          if (currentId === currentCategoryId) {
            throw new Error('Circular reference detected');
          }
          const currentCategory = await CategoryPackage.findByPk(currentId);
          currentId = currentCategory?.parent_id || null;
        }
      }
      return true;
    }),
];

// Validation middleware for ID parameter
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
];

// Validation middleware for query parameters
const validateQueryParams = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'deleted'])
    .withMessage('Status must be one of: active, inactive, deleted'),
  query('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
];

// Middleware to handle validation errors
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

// Create a new category
exports.createCategory = [
  validateCategory,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        description,
        status,
        parent_id,
        created_at = new Date(), // Default to current date if not provided
      } = req.body;
      if(name){
        // Check if category with the same name already exists
        const existingCategory = await CategoryPackage.findOne({
          where: { name, status: { [Sequelize.Op.ne]: 'deleted' } },
        });
        if (existingCategory) {
          return res.status(400).json({
            message: 'Category with this name already exists',
          });
        }
      }
      // Validate parent_id exists if provided
      if (parent_id) {
        const parentCategory = await CategoryPackage.findByPk(parent_id);
        if (!parentCategory) {
          return res.status(400).json({
            message: 'Parent category does not exist',
          });
        }
        // Check for circular reference
        let currentId = parent_id;
        while (currentId) {
          if (currentId === parent_id) {
            return res.status(400).json({
              message: 'Circular reference detected',
            });
          }
          const currentCategory = await CategoryPackage.findByPk(currentId);
          currentId = currentCategory?.parent_id || null;
        }
      }

      const category = await CategoryPackage.create({
        name,
        description,
        status,
        parent_id,
        created_at: new Date(created_at), // Ensure created_at is a Date object
      });

      return res.status(201).json({
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error creating category',
        error: error.message,
      });
    }
  },
];

// Get all categories with optional filtering
exports.getAllCategories = [
  validateQueryParams,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, parent_id } = req.query;
      const where = {};

      if (status) where.status = status;
      if (parent_id) where.parent_id = parent_id;

      const categories = await CategoryPackage.findAll({
        where,
        order: [['created_at', 'DESC']], // Order by created_at descending
        include: [{
          model: CategoryPackage,
          as: 'subCategories',
          required: false,
        }, {
          model: CategoryPackage,
          as: 'parentCategory',
          required: false,
        }],
      });

      return res.status(200).json({
        message: 'Categories retrieved successfully',
        data: categories,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error retrieving categories',
        error: error.message,
      });
    }
  },
];

// Get a single category by ID
exports.getCategoryById = [
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const category = await CategoryPackage.findByPk(id, {
        attributes: {
          exclude: ['created_at'], // Exclude created_at if not needed
        },
        include: [{
          model: CategoryPackage,
          as: 'subCategories',
          required: false,
        }, {
          model: CategoryPackage,
          as: 'parentCategory',
          required: false,
        }],
      });

      if (!category) {
        return res.status(404).json({
          message: 'Category not found',
        });
      }

      return res.status(200).json({
        message: 'Category retrieved successfully',
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error retrieving category',
        error: error.message,
      });
    }
  },
];

// Update a category
exports.updateCategory = [
  validateId,
  validateCategory,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        status,
        parent_id,
      } = req.body;

      const category = await CategoryPackage.findByPk(id);

      if (!category) {
        return res.status(404).json({
          message: 'Category not found',
        });
      }

      // Validate parent_id exists if provided
      if (parent_id && parent_id !== category.parent_id) {
        const parentCategory = await CategoryPackage.findByPk(parent_id);
        if (!parentCategory) {
          return res.status(400).json({
            message: 'Parent category does not exist',
          });
        }
        // Check for circular reference
        let currentId = parent_id;
        while (currentId) {
          if (currentId === parseInt(id)) {
            return res.status(400).json({
              message: 'Circular reference detected',
            });
          }
          const currentCategory = await CategoryPackage.findByPk(currentId);
          currentId = currentCategory?.parent_id || null;
        }
      }

      await category.update({
        name,
        description,
        status,
        parent_id,
      });

      return res.status(200).json({
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error updating category',
        error: error.message,
      });
    }
  },
];

// Delete a category (soft delete by setting status to 'deleted')
exports.deleteCategory = [
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const category = await CategoryPackage.findByPk(id);

      if (!category) {
        return res.status(404).json({
          message: 'Category not found',
        });
      }

      await category.update({ status: 'deleted' });

      return res.status(200).json({
        message: 'Category deleted successfully',
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error deleting category',
        error: error.message,
      });
    }
  },
];
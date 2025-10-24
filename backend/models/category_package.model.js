  module.exports = (sequelize, DataTypes) => {
    const CategoryPackage = sequelize.define('CategoryPackage', {
      category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'deleted'),
        allowNull: false,
        defaultValue: 'active',
      },
      parent_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'category_id',
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      tableName: 'categories',
      timestamps: false,
    });

    CategoryPackage.associate = (models) => {
      CategoryPackage.hasMany(models.ServicePackage, {
        foreignKey: 'category_id',
        as: 'servicePackages',
      });
      CategoryPackage.belongsTo(CategoryPackage, {
        foreignKey: 'parent_id',
        as: 'parentCategory',
      });
      CategoryPackage.hasMany(CategoryPackage, {
        foreignKey: 'parent_id',
        as: 'subCategories',
      });
    }
    return CategoryPackage;
  };

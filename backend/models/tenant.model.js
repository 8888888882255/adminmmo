module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define('Tenant', {
    tenant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    admin_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deleted'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'tenants',
    timestamps: false,
  });

  Tenant.associate = (models) => {
    Tenant.hasMany(models.User, {
      foreignKey: 'tenant_id',
      as: 'users',
    });
    Tenant.belongsTo(models.User, {
      foreignKey: 'admin_user_id',
      as: 'adminUser',
    });
    Tenant.belongsToMany(models.ServicePackage, {
      through: models.TenantOfferedPackage,
      foreignKey: 'tenant_id',
      as: 'offeredPackages',
    });
    Tenant.hasMany(models.ServiceData, {
      foreignKey: 'tenant_id',
      as: 'serviceData',
    });
  };

  return Tenant;
};
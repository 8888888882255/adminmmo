module.exports = (sequelize, DataTypes) => {
  const TenantOfferedPackage = sequelize.define('TenantOfferedPackage', {
    tenant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
    },
    package_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deleted'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'tenant_offered_packages',
    timestamps: false,
  });

  return TenantOfferedPackage;
};
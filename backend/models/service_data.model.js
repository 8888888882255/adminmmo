module.exports = (sequelize, DataTypes) => {
  const ServiceData = sequelize.define('ServiceData', {
    data_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    package_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    object_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    bandwidth_used: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    database_used: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    api_calls_used: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'service_data',
    timestamps: false,
  });

  ServiceData.associate = (models) => {
    ServiceData.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant',
    });
    ServiceData.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    ServiceData.belongsTo(models.ServicePackage, {
      foreignKey: 'package_id',
      as: 'package',
    });
  };

  return ServiceData;
};

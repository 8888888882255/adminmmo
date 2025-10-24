module.exports = (sequelize, DataTypes) => {
  const UserPurchase = sequelize.define('UserPurchase', {
    purchase_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    package_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purchase_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    start_date: { type: DataTypes.DATE, allowNull: false },
    end_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive', 'deleted','pending','failed','completed'), defaultValue: 'pending' },
    payment_id: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'user_purchases',
    timestamps: false,
  });

  UserPurchase.associate = (models) => {
    UserPurchase.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserPurchase.belongsTo(models.ServicePackage, { foreignKey: 'package_id', as: 'package' });
    UserPurchase.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
  };

  return UserPurchase;
};
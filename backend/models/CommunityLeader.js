"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CommunityLeader extends Model {
    static associate(models) {
      CommunityLeader.belongsTo(models.User, { foreignKey: "user_id" });
      CommunityLeader.belongsTo(models.Ward, { foreignKey: "ward_id" });
    }
  }

  CommunityLeader.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      token: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
      },
    },
    {
      sequelize,
      modelName: "CommunityLeader",
      tableName: "community_leaders",
      timestamps: true,
    }
  );

  return CommunityLeader;
};

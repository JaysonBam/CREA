"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Resident extends Model {
    static associate(models) {
      Resident.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      Resident.belongsTo(models.Ward, {
        foreignKey: "ward_id",
        as: "ward",
      });
      Resident.belongsTo(models.Location, {
        foreignKey: "location_id",
        as: "location",
      });
    }
  }
  Resident.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      token: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      ward_id: { type: DataTypes.BIGINT, allowNull: false },
      location_id: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      sequelize,
      modelName: "Resident",
      tableName: "residents",
    }
  );
  return Resident;
};

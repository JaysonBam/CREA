"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Resident extends Model {
    static associate(models) {
      Resident.belongsTo(models.User, { foreignKey: "user_id" });
      Resident.belongsTo(models.Ward, { foreignKey: "ward_id" });
    }
  }

  Resident.init(
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
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Resident",
      tableName: "residents",
      timestamps: true,
    }
  );

  return Resident;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Ward extends Model {
    static associate(models) {
      Ward.hasMany(models.Resident, { foreignKey: "ward_id" });
      Ward.hasMany(models.MunicipalStaff, { foreignKey: "ward_id" });
      Ward.hasMany(models.CommunityLeader, { foreignKey: "ward_id" });
    }
  }

  Ward.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
      },
      autoinc: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Ward",
      tableName: "wards",
      timestamps: true,
    }
  );

  return Ward;
};

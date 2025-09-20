"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MunicipalStaff extends Model {
    static associate(models) {
      MunicipalStaff.belongsTo(models.User, { foreignKey: "user_id" });
      MunicipalStaff.belongsTo(models.Ward, { foreignKey: "ward_id" });
    }
  }

  MunicipalStaff.init(
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
      job_description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "MunicipalStaff",
      tableName: "municipal_staff",
      timestamps: true,
    }
  );

  return MunicipalStaff;
};

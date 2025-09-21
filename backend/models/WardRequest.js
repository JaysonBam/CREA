"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WardRequest extends Model {
    static associate(models) {
  WardRequest.belongsTo(models.User, { foreignKey: 'person_id', as: 'person' });
  WardRequest.belongsTo(models.Ward, { foreignKey: 'ward_id', as: 'ward' });
    }
  }
  WardRequest.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      person_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      sender_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      job_description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ward_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "request",
      },
    },
    {
      sequelize,
      modelName: "WardRequest",
      tableName: "ward_requests",
      underscored: true,
      timestamps: true,
    }
  );
  return WardRequest;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WardRequest extends Model {
    static associate(models) {
      WardRequest.belongsTo(models.User, { foreignKey: 'person_id', as: 'person' });
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

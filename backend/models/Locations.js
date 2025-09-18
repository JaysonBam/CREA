"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      // A Location belongs to one IssueReport
      Location.belongsTo(models.IssueReport, {
        foreignKey: "issue_report_id",
        as : "issueReport",
      });
    }
  }
  Location.init(
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
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Location",
      tableName: "locations",
    }
  );
  return Location;
};
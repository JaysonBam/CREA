"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Vote extends Model {
    static associate(models) {
      Vote.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      Vote.belongsTo(models.IssueReport, { foreignKey: "issue_report_id", as: "issue" });
    }
  }

  Vote.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      issue_report_id: { type: DataTypes.BIGINT, allowNull: false },
      weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    },
    { sequelize, modelName: "Vote", tableName: "votes", indexes: [ { unique: true, fields: ["user_id", "issue_report_id"] } ] }
  );

  return Vote;
};
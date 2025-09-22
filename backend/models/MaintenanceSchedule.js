// models/MaintenanceSchedule.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MaintenanceSchedule extends Model {
    static associate(models) {
      // Important: tell Sequelize the exact FK column name in DB
      MaintenanceSchedule.belongsTo(models.IssueReport, {
        foreignKey: "issue_report_id",
        as: "issue",
      });
    }
  }

  MaintenanceSchedule.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      token: { type: DataTypes.UUID, allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
      // Option A: expose camelCase attribute but map to snake_case column in DB
      issueReportId: { type: DataTypes.BIGINT, allowNull: false, field: "issue_report_id" },
      description: { type: DataTypes.TEXT, allowNull: false },
      date_time_from: { type: DataTypes.DATE, allowNull: false },
      date_time_to: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "MaintenanceSchedule",
      tableName: "maintenance_schedules",
    }
  );

  return MaintenanceSchedule;
};

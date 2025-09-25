// models/MaintenanceSchedule.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MaintenanceSchedule extends Model {
    static associate(models) {
      // Foreign key with Issue_report
      MaintenanceSchedule.belongsTo(models.IssueReport, {
        foreignKey: "issue_report_id",
        as: "issue",
      });
    }
  }

  MaintenanceSchedule.init(
    {
      //Both an ID and a Token and not just an ID
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      token: { type: DataTypes.UUID, allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
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

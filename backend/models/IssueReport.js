"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssueReport extends Model {
    static associate(models) {
      // An Issue Report belongs to one User (the creator)
      IssueReport.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // An Issue Report has one Location
      IssueReport.belongsTo(models.Location, {
        foreignKey: "location_id",
        as: "location",
      });

      // An Issue Report can have many Votes
      // IssueReport.hasMany(models.Vote, {
      //   foreignKey: "issue_report_id",
      //   as: "votes",
      // });

      // An Issue Report has a history of many Status Changes
      // IssueReport.hasMany(models.StatusChange, {
      //   foreignKey: "issue_report_id",
      //   as: "statusChanges",
      // });

      // An Issue Report can have many File Attachments
      IssueReport.hasMany(models.FileAttachment, {
        foreignKey: "issue_report_id",
        as: "attachments",
      });

      // An Issue Report has one Message Thread
      // IssueReport.hasOne(models.MessageThread, {
      //   foreignKey: "issue_report_id",
      //   as: "messageThread",
      // });
    }
  }
  IssueReport.init(
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
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      category: {
        type: DataTypes.ENUM(
          "POTHOLE", "WATER_LEAK", "POWER_OUTAGE", "STREETLIGHT_FAILURE", "OTHER"
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "NEW", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"
        ),
        allowNull: false,
        defaultValue: "NEW",
      },
      reference_no: { type: DataTypes.STRING, unique: true, allowNull: true },
      votes_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "IssueReport",
      tableName: "issue_reports",
    }
  );
  return IssueReport;
};
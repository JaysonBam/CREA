"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReportIssueWatchlist extends Model {
    static associate(models) {
      // who is watching
      ReportIssueWatchlist.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // which issue is being watched
      ReportIssueWatchlist.belongsTo(models.IssueReport, {
        foreignKey: "report_issue_id",
        as: "issue",
      });
    }
  }

  ReportIssueWatchlist.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      report_issue_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      subscribed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "ReportIssueWatchlist",
      tableName: "report_issue_watchlists",
      timestamps: true,
    }
  );

  return ReportIssueWatchlist;
};

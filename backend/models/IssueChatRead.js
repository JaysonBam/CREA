"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssueChatRead extends Model {
    static associate(models) {
      IssueChatRead.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      IssueChatRead.belongsTo(models.IssueReport, { foreignKey: "issue_report_id", as: "issue" });
    }
  }

  IssueChatRead.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      last_seen_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "IssueChatRead",
      tableName: "issue_chat_reads",
      timestamps: true,
    }
  );

  return IssueChatRead;
};

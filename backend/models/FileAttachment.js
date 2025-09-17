"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FileAttachment extends Model {
    static associate(models) {
      // A File Attachment was uploaded by one User
      FileAttachment.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // A File Attachment belongs to one Issue Report
      FileAttachment.belongsTo(models.IssueReport, {
        foreignKey: "issue_report_id",
        as: "issueReport",
      });
    }
  }
  FileAttachment.init(
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
      file_link: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: true },
      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "FileAttachment",
      tableName: "file_attachments",
    }
  );
  return FileAttachment;
};
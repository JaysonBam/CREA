"use strict";
const { Model } = require("sequelize");
const crypto = require("crypto");

function genToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = (sequelize, DataTypes) => {
  class MunicipalStaffIssueReport extends Model {
    static associate(models) {
      MunicipalStaffIssueReport.belongsTo(models.MunicipalStaff, {
        foreignKey: "municipal_staff_id",
        as: "staff",
      });
      MunicipalStaffIssueReport.belongsTo(models.IssueReport, {
        foreignKey: "issue_report_id",
        as: "issue",
      });
    }
  }

  MunicipalStaffIssueReport.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      municipal_staff_id: { type: DataTypes.BIGINT, allowNull: false },
      issue_report_id: { type: DataTypes.BIGINT, allowNull: false },
      note: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "MunicipalStaffIssueReport",
      tableName: "municipal_staff_issue_reports",
      hooks: {
        beforeValidate(instance) {
          if (!instance.token) instance.token = genToken();
        },
      },
    }
  );

  return MunicipalStaffIssueReport;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Ward extends Model {
    static associate(models) {
      Ward.hasMany(models.Resident, { foreignKey: "ward_id" });
      Ward.hasOne(models.CommunityLeader, {
        as: "leader",
        foreignKey: "ward_id",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      Ward.hasMany(models.MunicipalStaff, {
        as: "staff",
        foreignKey: "ward_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      Ward.hasMany(models.IssueReport, {
        foreignKey: "ward_id",
        as: "issueReports",
      });

      Ward.addScope("withPeople", {
        include: [
          {
            model: models.CommunityLeader,
            as: "leader",
            include: [
              {
                model: models.User,
                attributes: ["id", "first_name", "last_name", "email"],
              },
            ],
          },
          {
            model: models.MunicipalStaff,
            as: "staff",
            include: [
              {
                model: models.User,
                attributes: ["id", "first_name", "last_name", "email"],
              },
            ],
          },
        ],
        order: [["id", "ASC"]],
      });
    }
  }

  Ward.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: "Ward",
      tableName: "wards",
      timestamps: true,
    }
  );

  return Ward;
};

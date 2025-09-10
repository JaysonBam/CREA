"use strict";
const { Model } = require("sequelize");
const crypto = require("crypto");

function genToken() {
  return crypto.randomBytes(24).toString("hex"); //Generate random token
}

module.exports = (sequelize, DataTypes) => {
  class TestCrud extends Model {
    static associate(models) {}
  }
  TestCrud.init(
    {
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "TestCrud",
      tableName: "test_cruds",
      hooks: {
        beforeValidate(instance) {
          if (!instance.token) instance.token = genToken();
        },
      },
    }
  );
  return TestCrud;
};

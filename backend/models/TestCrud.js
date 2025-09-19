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
      //Here you fill in all of the fields for the model
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
          //Generate a token if not present (should only happen on create)
          if (!instance.token) instance.token = genToken();
        },
      },
    }
  );
  return TestCrud;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TestCrud extends Model {
    static associate(models) {
      // define associations here if needed
    }
  }
  TestCrud.init(
    {
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "TestCrud",
      tableName: "test_cruds",
    }
  );
  return TestCrud;
};

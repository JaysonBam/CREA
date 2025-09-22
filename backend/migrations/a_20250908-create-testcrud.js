"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
//A migration to create the test_cruds table
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("test_cruds", {
      // Here you fill in all of the fields for the model
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      isActive: {
        type: Sequelize.BOOLEAN, //Validation that the field is a boolean
        allowNull: false, //Field is required
        defaultValue: true, //Default value is true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    // Here you can define the reverse of the migration (if needed)
    await queryInterface.dropTable("test_cruds");
  },
};

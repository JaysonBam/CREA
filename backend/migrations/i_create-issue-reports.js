"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("issue_reports", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      token: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.UUIDV4, //default -> autogenerate
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          "POTHOLE",
          "WATER_LEAK",
          "POWER_OUTAGE",
          "STREETLIGHT_FAILURE",
          "OTHER"
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "NEW",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "RESOLVED"
        ),
        allowNull: false,
        defaultValue: "NEW",
      },
      reference_no: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true, // Can be generated after creation
      },
      votes_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "users", // table name
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      location_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: "locations", // table name
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("issue_reports");
  },
};
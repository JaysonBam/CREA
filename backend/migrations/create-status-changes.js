"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("status_changes", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      from_status: {
        type: Sequelize.ENUM(
          "NEW",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "RESOLVED"
        ),
        allowNull: true, // Can be null for the initial status creation
      },
      to_status: {
        type: Sequelize.ENUM(
          "NEW",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "RESOLVED"
        ),
        allowNull: false,
      },
      // This field corresponds to 'changedAt' in the UML diagram
      changed_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      user_id: {
        type: Sequelize.BIGINT, // The user (staff) who made the change
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      issue_report_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "issue_reports",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Standard timestamps
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
    await queryInterface.dropTable("status_changes");
  },
};
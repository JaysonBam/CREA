"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("message_threads", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_closed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      issue_report_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true, // Ensures one thread per issue report
        references: {
          model: "issue_reports",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE", // If report is deleted, thread is deleted
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
    await queryInterface.dropTable("message_threads");
  },
};
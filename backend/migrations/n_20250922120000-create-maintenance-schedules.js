"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("maintenance_schedules", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      token: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
      },
      // FK aligned with your existing convention
      issue_report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "issue_reports", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      date_time_from: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      date_time_to: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.addIndex("maintenance_schedules", ["issue_report_id"]);
    await queryInterface.addIndex("maintenance_schedules", ["token"], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("maintenance_schedules");
  },
};

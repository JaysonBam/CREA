"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("issue_chat_reads", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      issue_report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "issue_reports", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addConstraint("issue_chat_reads", {
      type: "unique",
      fields: ["issue_report_id", "user_id"],
      name: "uq_issue_chat_reads_issue_user",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("issue_chat_reads");
  },
};

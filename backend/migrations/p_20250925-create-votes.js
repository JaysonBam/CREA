"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("votes", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE"
      },
      issue_report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "issue_reports", key: "id" },
        onDelete: "CASCADE"
      },
      weight: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 1 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex("votes", ["user_id", "issue_report_id"], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("votes");
  }
};
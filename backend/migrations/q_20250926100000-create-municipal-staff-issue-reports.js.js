"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("municipal_staff_issue_reports", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      token: { type: Sequelize.STRING(64), allowNull: false, unique: true },

      // FKs
      municipal_staff_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "municipal_staff", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      issue_report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "issue_reports", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // editable fields
      note: { type: Sequelize.TEXT, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.addIndex("municipal_staff_issue_reports", ["issue_report_id"]);
    await queryInterface.addIndex("municipal_staff_issue_reports", ["municipal_staff_id"]);
    await queryInterface.addConstraint("municipal_staff_issue_reports", {
      fields: ["issue_report_id", "municipal_staff_id"],
      type: "unique",
      name: "uq_msir_issue_staff_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("municipal_staff_issue_reports");
  },
};

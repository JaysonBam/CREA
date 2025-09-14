"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const staffUser = await queryInterface.sequelize.query(
      `SELECT id from USERS WHERE role = 'staff' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const issueReport = await queryInterface.sequelize.query(
      `SELECT id from "issue_reports" WHERE status = 'IN_PROGRESS' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!staffUser.length || !issueReport.length) {
      console.log(
        "Could not find a staff user or an 'IN_PROGRESS' issue report to create a status change log."
      );
      return;
    }

    await queryInterface.bulkInsert("status_changes", [
      // Log the change from NEW -> ACKNOWLEDGED
      {
        id: uuidv4(),
        from_status: "NEW",
        to_status: "ACKNOWLEDGED",
        user_id: staffUser[0].id,
        issue_report_id: issueReport[0].id,
        changed_at: new Date(new Date().setDate(new Date().getDate() - 1)), // 1 day ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Log the change from ACKNOWLEDGED -> IN_PROGRESS
      {
        id: uuidv4(),
        from_status: "ACKNOWLEDGED",
        to_status: "IN_PROGRESS",
        user_id: staffUser[0].id,
        issue_report_id: issueReport[0].id,
        changed_at: new Date(), // Now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("status_changes", null, {});
  },
};
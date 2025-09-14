"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const issueReports = await queryInterface.sequelize.query(
      `SELECT id, title from "issue_reports"`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!issueReports.length) {
      console.log("No issue reports found. Please run IssueReportSeeder first.");
      return;
    }

    const threads = issueReports.map((report) => ({
      id: uuidv4(),
      subject: `Re: ${report.title}`,
      is_closed: false,
      issue_report_id: report.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await queryInterface.bulkInsert("message_threads", threads);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("message_threads", null, {});
  },
};
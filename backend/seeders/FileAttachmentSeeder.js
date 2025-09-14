"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const issueReport = await queryInterface.sequelize.query(
      `SELECT id, user_id from "issue_reports" LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!issueReport.length) {
      console.log("No issue report found to attach a file to.");
      return;
    }

    await queryInterface.bulkInsert("file_attachments", [
      {
        id: uuidv4(),
        file_link: "https://example.com/images/pothole_image.jpg",
        description: "Photo of the pothole from the reporting user.",
        user_id: issueReport[0].user_id, // Attributed to the user who created the report
        issue_report_id: issueReport[0].id,
        uploaded_at: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("file_attachments", null, {});
  },
};
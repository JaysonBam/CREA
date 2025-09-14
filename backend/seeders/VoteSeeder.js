"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.sequelize.query(
      `SELECT id from USERS`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const issueReports = await queryInterface.sequelize.query(
      `SELECT id from "issue_reports" WHERE category = 'POTHOLE'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!users.length || !issueReports.length) {
      console.log("No users or issue reports found to create votes.");
      return;
    }

    // Have a few different users vote on the first pothole issue
    await queryInterface.bulkInsert("votes", [
      {
        id: uuidv4(),
        value: 1, // Upvote
        user_id: users[1].id, // resident1
        issue_report_id: issueReports[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        value: 1, // Upvote
        user_id: users[2].id, // resident2
        issue_report_id: issueReports[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("votes", null, {});
  },
};
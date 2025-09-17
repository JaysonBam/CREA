"use strict";

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
    console.log(issueReport.length);
    console.log(staffUser.length);

    if (!staffUser.length || !issueReport.length) {
      console.log(
        "Could not find a staff user or an 'IN_PROGRESS' issue report to create a status change log."
      );
      return;
    }

    await queryInterface.bulkInsert("status_changes", [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        from_status: "NEW",
        to_status: "ACKNOWLEDGED",
        user_id: staffUser[0].id,
        issue_report_id: issueReport[0].id,
        changed_at: new Date(new Date().setDate(new Date().getDate() - 1)),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        from_status: "ACKNOWLEDGED",
        to_status: "IN_PROGRESS",
        user_id: staffUser[0].id,
        issue_report_id: issueReport[0].id,
        changed_at: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("status_changes", null, {});
  },
};
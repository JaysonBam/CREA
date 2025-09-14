"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.sequelize.query(
      `SELECT id from USERS WHERE role = 'resident'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const locations = await queryInterface.sequelize.query(
      `SELECT id from LOCATIONS`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length < 2 || locations.length < 3) {
      console.log(
        "Not enough users or locations found. Please run UserSeeder and LocationSeeder first."
      );
      return;
    }

    await queryInterface.bulkInsert("issue_reports", [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Large Pothole on Lynnwood Road",
        description: "A deep pothole near the university entrance is causing traffic delays.",
        category: "POTHOLE",
        status: "NEW",
        votes_count: 1,
        user_id: users[0].id,
        location_id: locations[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Streetlight Out on Hilda Street",
        description: "The main streetlight on Hilda Street is not working, making it dark and unsafe.",
        category: "STREETLIGHT_FAILURE",
        status: "ACKNOWLEDGED",
        votes_count: 0,
        user_id: users[1].id,
        location_id: locations[1].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Water Pipe Burst on Jan Shoba",
        description: "There is a significant water leak on Jan Shoba street, flooding the pavement.",
        category: "WATER_LEAK",
        status: "IN_PROGRESS",
        votes_count: 0,
        user_id: users[0].id,
        location_id: locations[2].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("issue_reports", null, {});
  },
};
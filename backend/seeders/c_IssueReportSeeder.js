"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch users (residents) and locations to link them to issue reports
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
        id: uuidv4(),
        title: "Large Pothole on Main St",
        description: "There is a very large pothole causing traffic issues.",
        category: "POTHOLE",
        status: "NEW",
        votes_count: 1,
        user_id: users[0].id,
        location_id: locations[0].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: "Streetlight Out on Oak Ave",
        description: "The streetlight at the corner of Oak and 5th is out.",
        category: "STREETLIGHT_FAILURE",
        status: "ACKNOWLEDGED",
        votes_count: 0,
        user_id: users[1].id,
        location_id: locations[1].id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: "Water Leak in Park",
        description: "A sprinkler head appears to be broken and is leaking a lot of water.",
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
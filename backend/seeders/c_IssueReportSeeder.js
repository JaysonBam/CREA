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
        description:
          "A deep pothole near the university entrance is causing traffic delays.",
        category: "POTHOLE",
        status: "NEW",
        votes_count: 1,
        user_id: users[0].id,
        location_id: locations[0].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Streetlight Out on Hilda Street",
        description:
          "The main streetlight on Hilda Street is not working, making it dark and unsafe.",
        category: "STREETLIGHT_FAILURE",
        status: "ACKNOWLEDGED",
        votes_count: 0,
        user_id: users[1].id,
        location_id: locations[1].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Water Pipe Burst on Jan Shoba",
        description:
          "There is a significant water leak on Jan Shoba street, flooding the pavement.",
        category: "WATER_LEAK",
        status: "IN_PROGRESS",
        votes_count: 0,
        user_id: users[0].id,
        location_id: locations[2].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Broken Bench in Park",
        description:
          "There is a broken bench by Lynnwood Park that needs repair.",
        category: "OTHER",
        status: "RESOLVED",
        votes_count: 0,
        user_id: users[1].id,
        location_id: locations[0].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // --- Additional seed data for testing filters and search ---
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Power Outage in Sunnyside",
        description: "Multiple blocks without power since early morning.",
        category: "POWER_OUTAGE",
        status: "NEW",
        votes_count: 3,
        user_id: users[0].id,
        location_id: locations[1].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Overflowing Storm Drain",
        description: "Heavy rains causing drain overflow and road flooding.",
        category: "OTHER",
        status: "ACKNOWLEDGED",
        votes_count: 2,
        user_id: users[1].id,
        location_id: locations[2].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Streetlight Flickering on Park Ave",
        description:
          "Light flickers intermittently, unsafe for pedestrians at night.",
        category: "STREETLIGHT_FAILURE",
        status: "IN_PROGRESS",
        votes_count: 1,
        user_id: users[0].id,
        location_id: locations[0].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Potholes Cluster Near Mall",
        description:
          "Several potholes forming a cluster near the main mall entrance.",
        category: "POTHOLE",
        status: "ACKNOWLEDGED",
        votes_count: 5,
        user_id: users[1].id,
        location_id: locations[1].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Water Leak Behind Library",
        description:
          "Slow but persistent leak behind the public library building.",
        category: "WATER_LEAK",
        status: "IN_PROGRESS",
        votes_count: 0,
        user_id: users[0].id,
        location_id: locations[2].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        title: "Resolved: Traffic Light Malfunction",
        description:
          "Traffic lights were cycling incorrectly; issue has been resolved.",
        category: "OTHER",
        status: "RESOLVED",
        votes_count: 0,
        user_id: users[1].id,
        location_id: locations[0].id,
        ward_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("issue_reports", null, {});
  },
};

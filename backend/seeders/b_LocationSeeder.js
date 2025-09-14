"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("locations", [
      {
        id: uuidv4(),
        address: "123 Main St, Cityville",
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        address: "456 Oak Ave, Townburg",
        latitude: 34.0522,
        longitude: -118.2437,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        address: "789 Pine Ln, Villagetown",
        latitude: 41.8781,
        longitude: -87.6298,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("locations", null, {});
  },
};
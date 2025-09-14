"use strict";

// No longer need to require('uuid')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("locations", [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Corner of Lynnwood Rd & Roper St, Hatfield, Pretoria",
        latitude: -25.7546,
        longitude: 28.2314,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Hilda Street, Hatfield, Pretoria",
        latitude: -25.7522,
        longitude: 28.235,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Jan Shoba Street, Brooklyn, Pretoria",
        latitude: -25.758,
        longitude: 28.2388,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("locations", null, {});
  },
};
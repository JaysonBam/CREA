"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash("password", 10);

    await queryInterface.bulkInsert("users", [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "communityleader",
        first_name: "Community",
        last_name: "Leader1",
        email: "communityleader1@gmail.com",
        phone: "1234567890",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "resident",
        first_name: "Resident1",
        last_name: "Resident1",
        email: "resident1@gmail.com",
        phone: "1234567892",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "resident",
        first_name: "Resident2",
        last_name: "Resident2",
        email: "resident2@gmail.com",
        phone: "1234567893",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "staff",
        first_name: "staff1",
        last_name: "staff1",
        email: "staff1@gmail.com",
        phone: "1234567894",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "staff",
        first_name: "staff2",
        last_name: "staff2",
        email: "staff2@gmail.com",
        phone: "1234567895",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "admin",
        first_name: "admin1",
        last_name: "admin1",
        email: "admin1@gmail.com",
        phone: "1234567896",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "admin",
        first_name: "admin2",
        last_name: "admin2",
        email: "admin2@gmail.com",
        phone: "1234567897",
        password: hashedPassword,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", null, {});
  },
};

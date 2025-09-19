"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const ward1Id = Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4());
    const ward2Id = Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4());

    //Create wards
    await queryInterface.bulkInsert(
      "wards",
      [
        {
          id: ward1Id,
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          name: "Ward 1",
          code: "W1",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: ward2Id,
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          name: "Ward 2",
          code: "W2",
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    const hashedPassword = await bcrypt.hash("password", 10);

    //Create 2 users for each role (just to make it easier to test with)
    const users = [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "communityleader",
        first_name: "Community",
        last_name: "Leader1",
        email: "communityleader1@gmail.com",
        phone: "1234567890",
        password: hashedPassword,
        isActive: false,
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Create the users and save the IDs, to create a corresponding resident, communityleader and municipal_staff entry.
    const insertedUsers = await queryInterface.bulkInsert("users", users, {
      returning: ["id", "email", "role"],
    });

    const uid = (email) => insertedUsers.find((u) => u.email === email)?.id;

    //Resident
    await queryInterface.bulkInsert(
      "residents",
      [
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("resident1@gmail.com"),
          ward_id: ward1Id,
          address: "1 Example Street, Ward 1",
          createdAt: now,
          updatedAt: now,
        },
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("resident2@gmail.com"),
          ward_id: ward2Id,
          address: "2 Example Avenue, Ward 2",
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // Municipal Staff
    await queryInterface.bulkInsert(
      "municipal_staff",
      [
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("staff1@gmail.com"),
          ward_id: ward1Id,
          job_description: "Field Technician",
          createdAt: now,
          updatedAt: now,
        },
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("staff2@gmail.com"),
          ward_id: ward2Id,
          job_description: "Operations Officer",
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // Community Leaders
    await queryInterface.bulkInsert(
      "community_leaders",
      [
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("communityleader1@gmail.com"),
          ward_id: ward1Id,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("community_leaders", null, {});
    await queryInterface.bulkDelete("municipal_staff", null, {});
    await queryInterface.bulkDelete("residents", null, {});

    await queryInterface.bulkDelete(
      "users",
      {
        email: {
          [Sequelize.Op.in]: [
            "communityleader1@gmail.com",
            "resident1@gmail.com",
            "resident2@gmail.com",
            "staff1@gmail.com",
            "staff2@gmail.com",
            "admin1@gmail.com",
            "admin2@gmail.com",
          ],
        },
      },
      {}
    );

    await queryInterface.bulkDelete(
      "wards",
      { code: { [Sequelize.Op.in]: ["W1", "W2"] } },
      {}
    );
  },
};

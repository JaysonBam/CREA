"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1) Insert wards (BIGINT auto-increment 'id')
    const insertedWards = await queryInterface.bulkInsert(
      "wards",
      [
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          name: "Ward 1",
          code: "W1",
          createdAt: now,
          updatedAt: now,
        },
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          name: "Ward 2",
          code: "W2",
          createdAt: now,
          updatedAt: now,
        },
      ],
      { returning: ["id", "code"] } // Postgres supports returning; others may not
    );

    const wardIdByCode = {};
    for (const w of insertedWards || []) wardIdByCode[w.code] = w.id;

    // Fallback (dialects w/o returning)
    if (!wardIdByCode.W1 || !wardIdByCode.W2) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, code FROM wards WHERE code IN ('W1','W2')`
      );
      for (const r of rows) wardIdByCode[r.code] = r.id;
    }

    const ward1Id = wardIdByCode.W1;
    const ward2Id = wardIdByCode.W2;

    // 2) Insert users
    const hashedPassword = await bcrypt.hash("password", 10);
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

    const insertedUsers = await queryInterface.bulkInsert("users", users, {
      returning: ["id", "email", "role"],
    });

    const uid = (email) => insertedUsers.find((u) => u.email === email)?.id;

    // 3) Insert locations (normalized addresses)
    const locationsToInsert = [
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "1 Example Street, Ward 1",
        place_id: null, // or a real place_id if you want
        latitude: -25.8355460, // demo values
        longitude: 28.2530010,
        createdAt: now,
        updatedAt: now,
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "2 Example Avenue, Ward 2",
        place_id: null,
        latitude: -25.9000000,
        longitude: 28.2000000,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const insertedLocations = await queryInterface.bulkInsert(
      "locations",
      locationsToInsert,
      { returning: ["id", "address"] }
    );

    const lid = (address) =>
      insertedLocations.find((l) => l.address === address)?.id;

    // Fallback if returning unsupported
    if (!lid("1 Example Street, Ward 1") || !lid("2 Example Avenue, Ward 2")) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, address FROM locations WHERE address IN (:a1,:a2)`,
        {
          replacements: {
            a1: "1 Example Street, Ward 1",
            a2: "2 Example Avenue, Ward 2",
          },
        }
      );
      // rebuild a quick lookup
      const byAddress = {};
      for (const r of rows) byAddress[r.address] = r.id;
      // overwrite helper to use the lookup
      locationsToInsert.forEach((l) => {
        if (!insertedLocations.find((x) => x?.id)) {
          insertedLocations.push({ id: byAddress[l.address], address: l.address });
        }
      });
    }

    const loc1Id = insertedLocations.find(
      (l) => l.address === "1 Example Street, Ward 1"
    )?.id;
    const loc2Id = insertedLocations.find(
      (l) => l.address === "2 Example Avenue, Ward 2"
    )?.id;

    // 4) Insert residents referencing location_id (NO address column on residents)
    await queryInterface.bulkInsert(
      "residents",
      [
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("resident1@gmail.com"),
          ward_id: ward1Id,
          location_id: loc1Id || null,
          createdAt: now,
          updatedAt: now,
        },
        {
          token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          user_id: uid("resident2@gmail.com"),
          ward_id: ward2Id,
          location_id: loc2Id || null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // 5) Staff & community leaders
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
    // Delete children first
    await queryInterface.bulkDelete("community_leaders", null, {});
    await queryInterface.bulkDelete("municipal_staff", null, {});
    await queryInterface.bulkDelete("residents", null, {});

    // Delete the demo locations we created
    await queryInterface.bulkDelete(
      "locations",
      {
        address: {
          [Sequelize.Op.in]: [
            "1 Example Street, Ward 1",
            "2 Example Avenue, Ward 2",
          ],
        },
      },
      {}
    );

    // Delete demo users
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

    // Delete demo wards
    await queryInterface.bulkDelete(
      "wards",
      { code: { [Sequelize.Op.in]: ["W1", "W2"] } },
      {}
    );
  },
};

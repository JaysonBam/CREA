"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    // Get ward IDs for W1 and W2
    const [wards] = await queryInterface.sequelize.query(
      `SELECT id, code FROM wards WHERE code IN ('W1','W2')`
    );
    const ward1Id = wards.find(w => w.code === 'W1')?.id;
    const ward2Id = wards.find(w => w.code === 'W2')?.id;
    if (!ward1Id || !ward2Id) throw new Error('Wards W1 and W2 must exist');

    // Create 10 staff and 10 leaders, split between wards
    const hashedPassword = await bcrypt.hash("password", 10);
    const users = [];
    for (let i = 1; i <= 10; i++) {
      users.push({
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "staff",
        first_name: `Staff${i}`,
        last_name: `Demo`,
        email: `staff${i}@demo.com`,
        phone: `100000000${i}`,
        password: hashedPassword,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });
      users.push({
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        role: "communityleader",
        first_name: `Leader${i}`,
        last_name: `Demo`,
        email: `leader${i}@demo.com`,
        phone: `200000000${i}`,
        password: hashedPassword,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    const insertedUsers = await queryInterface.bulkInsert("users", users, {
      returning: ["id", "email", "role"],
    });
    // Helper to get user id by email
    const uid = email => {
      if (Array.isArray(insertedUsers)) return insertedUsers.find(u => u.email === email)?.id;
      // fallback for dialects without returning
      return null;
    };
    // Add to staff and leader tables after confirmation (simulate as not confirmed yet)
    // No entries in municipal_staff or community_leaders yet
  },

  async down(queryInterface, Sequelize) {
    // Remove demo users
    await queryInterface.bulkDelete(
      "users",
      {
        email: [
          ...Array.from({length: 10}, (_, i) => `staff${i+1}@demo.com`),
          ...Array.from({length: 10}, (_, i) => `leader${i+1}@demo.com`)
        ]
      },
      {}
    );
  },
};

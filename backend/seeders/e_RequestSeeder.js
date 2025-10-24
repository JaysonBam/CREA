"use strict";

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

    // Get user IDs for staff and leaders
    const [users] = await queryInterface.sequelize.query(
      `SELECT id, email, role FROM users WHERE email LIKE 'staff%@demo.com' OR email LIKE 'leader%@demo.com'`
    );
    // Split users by role and ward
    const staff = users.filter(u => u.role === 'staff');
    const leaders = users.filter(u => u.role === 'communityleader');
    // Assign half to ward1, half to ward2
    const staffWard1 = staff.slice(0, 5).map(u => ({...u, ward_id: ward1Id}));
    const staffWard2 = staff.slice(5).map(u => ({...u, ward_id: ward2Id}));
    const leaderWard1 = leaders.slice(0, 5).map(u => ({...u, ward_id: ward1Id}));
    const leaderWard2 = leaders.slice(5).map(u => ({...u, ward_id: ward2Id}));

    // Create requests for each user
    const requests = [];
    staffWard1.forEach((u, i) => {
        const staffJobs = [
          "Sanitation Officer",
          "Public Works Inspector",
          "Community Health Worker",
          "Municipal Clerk",
          "Urban Planner",
          "Water Services Technician",
          "Parks Supervisor",
          "Road Maintenance Foreman",
          "Building Safety Officer",
          "Environmental Compliance Specialist"
        ];
        requests.push({
          person_id: u.id,
          sender_id: u.id,
          ward_id: ward1Id,
          job_description: staffJobs[i % staffJobs.length],
          message: `Request from staff ${i+1} in Ward 1`,
          created_at: now,
          updated_at: now,
        });
    });
    staffWard2.forEach((u, i) => {
        const staffJobs = [
          "Sanitation Officer",
          "Public Works Inspector",
          "Community Health Worker",
          "Municipal Clerk",
          "Urban Planner",
          "Water Services Technician",
          "Parks Supervisor",
          "Road Maintenance Foreman",
          "Building Safety Officer",
          "Environmental Compliance Specialist"
        ];
        requests.push({
          person_id: u.id,
          sender_id: u.id,
          ward_id: ward2Id,
          job_description: staffJobs[i % staffJobs.length],
          message: `Request from staff ${i+6} in Ward 2`,
          created_at: now,
          updated_at: now,
        });
    });
    leaderWard1.forEach((u, i) => {
        requests.push({
          person_id: u.id,
          sender_id: u.id,
          ward_id: ward1Id,
          job_description: "Community Leader",
          message: `Request from leader ${i+1} in Ward 1`,
          created_at: now,
          updated_at: now,
        });
    });
    leaderWard2.forEach((u, i) => {
        requests.push({
          person_id: u.id,
          sender_id: u.id,
          ward_id: ward2Id,
          job_description: "Community Leader",
          message: `Request from leader ${i+6} in Ward 2`,
          created_at: now,
          updated_at: now,
        });
    });
    await queryInterface.bulkInsert("ward_requests", requests, {});
  },

  async down(queryInterface, Sequelize) {
    // Remove demo requests for test users
    await queryInterface.bulkDelete(
      "ward_requests",
      {
        message: [
          ...Array.from({length: 5}, (_, i) => `Request from staff ${i+1} in Ward 1`),
          ...Array.from({length: 5}, (_, i) => `Request from staff ${i+6} in Ward 2`),
          ...Array.from({length: 5}, (_, i) => `Request from leader ${i+1} in Ward 1`),
          ...Array.from({length: 5}, (_, i) => `Request from leader ${i+6} in Ward 2`)
        ]
      },
      {}
    );
  },
};

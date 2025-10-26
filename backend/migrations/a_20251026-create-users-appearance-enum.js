"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum type if it doesn't already exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_appearance') THEN
          CREATE TYPE enum_users_appearance AS ENUM ('light','dark');
        END IF;
      END$$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop enum type if it exists (undo)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_appearance') THEN
          DROP TYPE enum_users_appearance;
        END IF;
      END$$;
    `);
  },
};

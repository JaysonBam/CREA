"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("community_leaders", {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      token: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.UUIDV4,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ward_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "wards", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("community_leaders", ["user_id"]);
    await queryInterface.addIndex("community_leaders", ["ward_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("community_leaders");
  },
};

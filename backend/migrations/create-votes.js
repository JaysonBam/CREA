"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("votes", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      // In the diagram, value is int <<{+1 only}>>. This represents an upvote.
      // A more flexible design might allow -1 for downvotes.
      value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isIn: [[1, -1]], // Optional: Restrict to upvotes/downvotes
        },
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      issue_report_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "issue_reports",
          key: "id",
        },
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

    // Add a composite unique key to prevent a user from voting more than once
    // on the same issue report.
    await queryInterface.addConstraint("votes", {
      fields: ["user_id", "issue_report_id"],
      type: "unique",
      name: "unique_user_vote_per_issue",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("votes");
  },
};
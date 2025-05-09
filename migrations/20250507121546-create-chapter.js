/* eslint-disable no-unused-vars */
"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Chapters", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      chaptername: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
      courseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Courses", // Make sure this matches the name of your Courses table
          key: "id",
        },
        onDelete: "CASCADE", // Ensures that when a course is deleted, related chapters are also deleted
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Chapters");
  },
};

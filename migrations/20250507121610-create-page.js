/* eslint-disable no-unused-vars */
"use strict";

const { sequelize } = require("../models");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Pages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
      },
      content: {
        type: Sequelize.TEXT,
      },
      chapterId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Chapters", // name of the referenced table
          key: "id", // primary key of the referenced table
        },
        onDelete: "CASCADE", // Optional: Automatically delete pages when the associated chapter is deleted
      },
      completed: {
        type: sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable("Pages");
  },
};

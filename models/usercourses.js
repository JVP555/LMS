"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserCourses extends Model {
    static associate(models) {
      // Optional: Define associations if needed
    }
  }

  UserCourses.init(
    {},
    {
      sequelize,
      modelName: "UserCourses",
      tableName: "UserCourses",
      timestamps: true,
    }
  );

  return UserCourses;
};

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // One educator can create many courses
      User.hasMany(models.Course, { foreignKey: "userId" });

      // Student can enroll in many courses
      User.belongsToMany(models.Course, {
        through: "UserCourses",
        foreignKey: "userId",
        as: "enrolledCourses",
      });
    }
  }

  User.init(
    {
      role: DataTypes.STRING,
      firstname: DataTypes.STRING,
      lastname: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    }
  );

  return User;
};

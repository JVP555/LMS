"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Course, { foreignKey: "userId" });

      User.belongsToMany(models.Course, {
        through: models.UserCourses,
        foreignKey: "userId",
        otherKey: "courseId",
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

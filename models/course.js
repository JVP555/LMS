"use strict";

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define("Course", {
    coursename: DataTypes.STRING,
  });

  Course.associate = (models) => {
    Course.belongsTo(models.User, { foreignKey: "userId" });

    Course.hasMany(models.Chapter, { foreignKey: "courseId" });

    Course.belongsToMany(models.User, {
      through: models.UserCourses,
      foreignKey: "courseId",
      otherKey: "userId",
      as: "students",
    });
  };

  return Course;
};

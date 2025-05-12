"use strict";

module.exports = (sequelize, DataTypes) => {
  const UserCourses = sequelize.define("UserCourses", {}, {});

  return UserCourses;
};

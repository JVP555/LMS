// models/course.js
module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define("Course", {
    coursename: DataTypes.STRING,
  });

  Course.associate = (models) => {
    Course.belongsTo(models.User, { foreignKey: "userId" });
    Course.hasMany(models.Chapter, { foreignKey: "courseId" });
  };

  return Course;
};

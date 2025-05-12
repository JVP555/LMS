module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define("Course", {
    coursename: DataTypes.STRING,
  });

  Course.associate = (models) => {
    // Creator of the course
    Course.belongsTo(models.User, { foreignKey: "userId" });

    // Chapters in the course
    Course.hasMany(models.Chapter, { foreignKey: "courseId" });

    // Students enrolled in the course
    Course.belongsToMany(models.User, {
      through: "UserCourses",
      foreignKey: "courseId",
      as: "enrolledStudents",
    });
  };

  return Course;
};

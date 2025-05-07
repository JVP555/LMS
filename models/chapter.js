// models/chapter.js
module.exports = (sequelize, DataTypes) => {
  const Chapter = sequelize.define("Chapter", {
    chaptername: DataTypes.STRING,
    description: DataTypes.TEXT,
  });

  Chapter.associate = (models) => {
    Chapter.belongsTo(models.Course, { foreignKey: "courseId" });
    Chapter.hasMany(models.Page, { foreignKey: "chapterId" });
  };

  return Chapter;
};

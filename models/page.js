// models/page.js
module.exports = (sequelize, DataTypes) => {
  const Page = sequelize.define("Page", {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
  });

  Page.associate = (models) => {
    Page.belongsTo(models.Chapter, { foreignKey: "chapterId" });
  };

  return Page;
};

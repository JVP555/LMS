module.exports = (sequelize, DataTypes) => {
  const Page = sequelize.define("Page", {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  Page.associate = (models) => {
    Page.belongsTo(models.Chapter, { foreignKey: "chapterId" });
  };

  return Page;
};

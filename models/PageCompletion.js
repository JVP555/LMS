// models/PageCompletion.js
module.exports = (sequelize, DataTypes) => {
  const PageCompletion = sequelize.define("PageCompletion", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  PageCompletion.associate = (models) => {
    PageCompletion.belongsTo(models.User, { foreignKey: "userId" });
    PageCompletion.belongsTo(models.Page, { foreignKey: "pageId" });
  };

  return PageCompletion;
};

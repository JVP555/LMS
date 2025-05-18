const { sequelize } = require("./models");

module.exports = async () => {
  await sequelize.close(); // Close DB once after all tests
};

/* eslint-disable no-undef */
"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

let sequelize;

// Use DATABASE_URL in production (Render)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false, // disable SQL logging
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // For Render's managed Postgres
      },
    },
  });
} else {
  // Local dev/test environment
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Read all model files and import
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Setup associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

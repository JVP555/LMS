"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static addTodo({ title, dueDate, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId,
      });
    }

    static getTodos() {
      return this.findAll();
    }

    static async overdue(userId) {
      const { Op } = require("sequelize");
      return this.findAll({
        where: {
          dueDate: { [Op.lt]: new Date().toISOString().split("T")[0] },
          completed: false,
          userId,
        },
        order: [["dueDate", "ASC"]],
      });
    }

    static async dueToday(userId) {
      return this.findAll({
        where: {
          dueDate: new Date().toISOString().split("T")[0],
          completed: false,
          userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueLater(userId) {
      const { Op } = require("sequelize");
      return this.findAll({
        where: {
          dueDate: { [Op.gt]: new Date().toISOString().split("T")[0] },
          completed: false,
          userId,
        },
        order: [["dueDate", "ASC"]],
      });
    }

    static async completedTodo(userId) {
      return this.findAll({
        where: {
          completed: true,
          userId,
        },
        order: [["dueDate", "ASC"]],
      });
    }

    setCompletionStatus(completed) {
      return this.update({ completed });
    }

    static async remove(id, userId) {
      return this.destroy({
        where: {
          id,
          userId,
        },
      });
    }
  }

  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );

  return Todo;
};

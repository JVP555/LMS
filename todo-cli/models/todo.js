"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static async addTask(params) {
      return await Todo.create(params);
    }
    static async showList() {
      console.log("My Todo list\n");

      console.log("Overdue");
      const overdueTasks = await this.overdue();
      overdueTasks.forEach((task) => {
        console.log(task.displayableString());
      });
      console.log("\n");

      console.log("Due Today");
      const dueTodayTasks = await this.dueToday();
      dueTodayTasks.forEach((task) => {
        console.log(task.displayableString());
      });
      console.log("\n");

      console.log("Due Later");
      const dueLaterTasks = await this.dueLater();
      dueLaterTasks.forEach((task) => {
        console.log(task.displayableString());
      });
      console.log("\n");
    }

    static async overdue() {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
        },
      });
    }

    static async dueToday() {
      return await Todo.findAll({
        where: {
          dueDate: new Date(),
        },
      });
    }

    static async dueLater() {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
        },
      });
    }

    static async markAsComplete(id) {
      const todo = await Todo.findByPk(id);
      if (todo) {
        todo.completed = true;
        await todo.save();
      }
      return todo;
    }

    displayableString() {
      let checkbox = this.completed ? "[x]" : "[ ]";
      const today = new Date().toISOString().split("T")[0]; // Format today as 'YYYY-MM-DD'
      if (this.dueDate != today) {
        return `${this.id}. ${checkbox} ${this.title} ${this.dueDate}`;
      } else {
        return `${this.id}. ${checkbox} ${this.title}`;
      }
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
    },
  );
  return Todo;
};

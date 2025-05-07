module.exports = {
  up: async (queryInterface, Sequelize) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const overdueDate = new Date();
    overdueDate.setDate(today.getDate() - 1);

    await queryInterface.bulkInsert(
      "Todos",
      [
        {
          title: "Overdue Task",
          dueDate: overdueDate,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: "Due Today Task",
          dueDate: today,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: "Due Later Task",
          dueDate: tomorrow,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: "Completed Task",
          dueDate: today,
          completed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("Todos", null, {});
  },
};

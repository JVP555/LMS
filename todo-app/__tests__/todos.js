/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  const res = await agent.get("/login");
  const csrfToken = extractCsrfToken(res);
  await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

// Normalize date to YYYY-MM-DD to avoid time zone issues
function toISODate(d) {
  return d.toISOString().split("T")[0];
}

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up", async () => {
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/users").send({
      firstName: "test",
      lastName: "user",
      email: "q4m5t@example.com",
      password: "password",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
  test("Sign out", async () => {
    const res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
  });

  test("create sample due today item", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "add due today todo",
      dueDate: toISODate(new Date()),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("create sample due later item", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const response = await agent.post("/todos").send({
      title: "add due later todo",
      dueDate: toISODate(tomorrow),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("create sample overdue item", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const response = await agent.post("/todos").send({
      title: "add overdue todo",
      dueDate: toISODate(yesterday),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("mark sample overdue item as completed", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await agent.post("/todos").send({
      title: "Overdue to complete",
      dueDate: toISODate(yesterday),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");

    const parsedGroupedTodosResponse = JSON.parse(groupedTodosResponse.text);
    const overdueTodos = parsedGroupedTodosResponse.overdue || [];
    expect(overdueTodos.length).toBeGreaterThan(0);

    const latestTodo = overdueTodos[overdueTodos.length - 1];
    const todoId = latestTodo.id;

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .post(`/todos/${todoId}`)
      .set("Accept", "application/json")
      .send({
        completed: true,
        _csrf: csrfToken,
        _method: "PUT",
      });

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("toggle a completed item to incomplete when clicked on it", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Mark as incomplete",
      dueDate: toISODate(new Date()),
      completed: true,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");

    const parsedGroupedTodosResponse = JSON.parse(groupedTodosResponse.text);
    const completedTodos = parsedGroupedTodosResponse.completedTodo || [];
    expect(completedTodos.length).toBeGreaterThan(0);

    const latestTodo = completedTodos[completedTodos.length - 1];
    const todoId = latestTodo.id;

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markIncompleteResponse = await agent
      .post(`/todos/${todoId}`)
      .set("Accept", "application/json")
      .send({
        completed: false,
        _csrf: csrfToken,
        _method: "PUT",
      });

    const parsedUpdateResponse = JSON.parse(markIncompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(false);
  });

  test("Deletes a todo", async () => {
    const agent = request.agent(server);
    await login(agent, "q4m5t@example.com", "password");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "to Deletecomplete",
      dueDate: toISODate(new Date()),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");

    const parsedGroupedTodosResponse = JSON.parse(groupedTodosResponse.text);
    const dueToday = parsedGroupedTodosResponse.dueToday || [];
    expect(dueToday.length).toBeGreaterThan(0);

    const latestTodo = dueToday[dueToday.length - 1];
    const todoId = latestTodo.id;

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deleteResponse = await agent
      .post(`/todos/${todoId}/delete`)
      .set("Accept", "application/json")
      .send({
        _csrf: csrfToken,
        _method: "DELETE",
      });

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual(true);

    const deletedTodo = await db.Todo.findByPk(todoId);
    expect(deletedTodo).toBeNull();
  });
});

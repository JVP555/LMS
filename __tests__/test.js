/* eslint-disable no-undef */
// test.js
const request = require("supertest");
const app = require("../app");
// eslint-disable-next-line no-unused-vars
const { sequelize, User, Course, Chapter, Page } = require("../models");

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Recreate DB for testing
});

afterAll(async () => {
  await sequelize.close();
});

describe("LMS Application", () => {
  let educatorSession;
  let courseId;
  let chapterId;
  let pageId;

  test("Signup as educator", async () => {
    const res = await request(app).post("/userssignup").send({
      role: "educator",
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/Educator");
  });

  test("Signin as educator", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "educator",
      email: "jane@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/Educator");
    educatorSession = res.headers["set-cookie"];
  });

  test("Create new course", async () => {
    const res = await request(app)
      .post("/courses")
      .set("Cookie", educatorSession)
      .send({ coursename: "Test Course" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/\/newchapter\/\d+/);

    // Extract course ID from redirect URL
    courseId = res.headers.location.split("/").pop();
  });

  test("Create new chapter", async () => {
    const res = await request(app)
      .post(`/newchapter/${courseId}`)
      .set("Cookie", educatorSession)
      .send({
        chaptername: "Intro Chapter",
        description: "Chapter description",
      });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/\/newpage\/\d+/);

    chapterId = res.headers.location.split("/").pop();
  });

  test("Create new page", async () => {
    const res = await request(app)
      .post(`/newpage/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({
        title: "Page 1",
        content: "This is page content.",
      });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/\/page\/\d+/);

    pageId = res.headers.location.split("/").pop();
  });

  test("Fetch created page", async () => {
    const res = await request(app)
      .get(`/page/${pageId}`)
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Page 1");
    expect(res.text).toContain("This is page content.");
  });

  test("Mark page as completed", async () => {
    const res = await request(app)
      .post(`/markCompleted/${pageId}`)
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/page/${pageId}`);
  });

  test("Logout educator", async () => {
    const res = await request(app)
      .get("/logout")
      .set("Cookie", educatorSession);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/signin");
  });
});

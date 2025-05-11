/* eslint-disable no-undef */
const request = require("supertest");
const app = require("../app");
const { sequelize, User } = require("../models");

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("LMS Application", () => {
  let educatorSession, studentSession;
  let educatorId, studentId;
  let courseId, chapterId, pageId;

  // -------- Educator Tests --------

  test("Educator Signup", async () => {
    await request(app).post("/userssignup").send({
      role: "educator",
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      password: "password123",
    });

    const educator = await User.findOne({
      where: { email: "jane@example.com" },
    });
    educatorId = educator.id;
  });

  test("Educator Signin", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "educator",
      email: "jane@example.com",
      password: "password123",
    });
    educatorSession = res.headers["set-cookie"];
    expect(res.statusCode).toBe(302);
  });

  test("Educator updates password", async () => {
    const res = await request(app)
      .post(`/changepassword/${educatorId}`)
      .set("Cookie", educatorSession)
      .send({
        currentPassword: "password123",
        newPassword: "newpass456",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Educator creates course", async () => {
    const res = await request(app)
      .post("/courses")
      .set("Cookie", educatorSession)
      .send({ coursename: "Course 1" });

    courseId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator adds chapter", async () => {
    const res = await request(app)
      .post(`/newchapter/${courseId}`)
      .set("Cookie", educatorSession)
      .send({
        chaptername: "Intro",
        description: "Intro Desc",
      });

    chapterId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator edits chapter", async () => {
    const res = await request(app)
      .post(`/chapters/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({
        chaptername: "Updated Intro",
        description: "Updated Desc",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Educator adds page", async () => {
    const res = await request(app)
      .post(`/newpage/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({
        title: "Page 1",
        content: "Content 1",
      });

    pageId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator edits page", async () => {
    const res = await request(app)
      .post(`/pages/${pageId}/edit`)
      .set("Cookie", educatorSession)
      .send({
        title: "Updated Page",
        content: "Updated content",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Logout", async () => {
    const res = await request(app)
      .get("/logout")
      .set("Cookie", educatorSession);
    expect(res.statusCode).toBe(302);
  });

  // -------- Student Tests --------

  test("Student Signup", async () => {
    await request(app).post("/userssignup").send({
      role: "student",
      firstname: "Student",
      lastname: "One",
      email: "student@example.com",
      password: "studypass",
    });

    const student = await User.findOne({
      where: { email: "student@example.com" },
    });
    studentId = student.id;
  });

  test("Student Signin", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "student",
      email: "student@example.com",
      password: "studypass",
    });
    studentSession = res.headers["set-cookie"];
    expect(res.statusCode).toBe(302);
  });

  test("Student updates password", async () => {
    const res = await request(app)
      .post(`/changepassword/${studentId}`)
      .set("Cookie", studentSession)
      .send({
        currentPassword: "studypass",
        newPassword: "newstudypass",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Student Logout", async () => {
    const res = await request(app).get("/logout").set("Cookie", studentSession);
    expect(res.statusCode).toBe(302);
  });
});

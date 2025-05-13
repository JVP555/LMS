const request = require("supertest");
const app = require("../app");
const { sequelize, User } = require("../models");

let educatorSession, educatorId, courseId, chapterId, pageId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Educator Suite", () => {
  test("Educator Sign Up", async () => {
    await request(app).post("/userssignup").send({
      role: "educator",
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@edu.com",
      password: "pass123",
    });

    const educator = await User.findOne({ where: { email: "jane@edu.com" } });
    educatorId = educator.id;
  });

  test("Educator Sign In", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "educator",
      email: "jane@edu.com",
      password: "pass123",
    });

    educatorSession = res.headers["set-cookie"];
    expect(res.statusCode).toBe(302);
  });

  test("Educator Update Password", async () => {
    const res = await request(app)
      .post(`/changepassword/${educatorId}`)
      .set("Cookie", educatorSession)
      .send({
        currentPassword: "pass123",
        newPassword: "newpass456",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Creates Course", async () => {
    const res = await request(app)
      .post("/courses")
      .set("Cookie", educatorSession)
      .send({ coursename: "Physics 101" });

    courseId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator Adds Chapter", async () => {
    const res = await request(app)
      .post(`/newchapter/${courseId}`)
      .set("Cookie", educatorSession)
      .send({ chaptername: "Kinematics", description: "Basics of motion" });

    chapterId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator Adds Page", async () => {
    const res = await request(app)
      .post(`/newpage/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({ title: "Displacement vs Distance", content: "..." });

    pageId = res.headers.location.split("/").pop();
    expect(res.statusCode).toBe(302);
  });

  test("Educator Edits Chapter", async () => {
    const res = await request(app)
      .post(`/chapters/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({ chaptername: "Kinematics Revised", description: "Updated" });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Edits Page", async () => {
    const res = await request(app)
      .post(`/pages/${pageId}/edit`)
      .set("Cookie", educatorSession)
      .send({ title: "Updated Page Title", content: "Updated content" });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Views Reports", async () => {
    const res = await request(app)
      .get("/educator/reports")
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(200);
  });

  test("Educator Logout", async () => {
    const res = await request(app)
      .get("/logout")
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
  });
});

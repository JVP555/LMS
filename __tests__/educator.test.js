/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require("supertest");
const app = require("../app");
const {
  sequelize,
  User,
  Course,
  Chapter,
  Page,
  UserCourses,
  PageCompletion,
} = require("../models");

let educatorSession, educatorId, courseId, chapterId, pageId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Educator Suite", () => {
  test("Educator Sign Up", async () => {
    const res = await request(app).post("/userssignup").send({
      role: "educator",
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@edu.com",
      password: "pass123",
    });

    expect(res.statusCode).toBe(302);

    const educator = await User.findOne({ where: { email: "jane@edu.com" } });
    expect(educator).not.toBeNull();
    educatorId = educator.id;
  });

  test("Educator Sign In", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "educator",
      email: "jane@edu.com",
      password: "pass123",
    });

    expect(res.statusCode).toBe(302);
    educatorSession = res.headers["set-cookie"];
    expect(educatorSession).toBeDefined();
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

    expect(res.statusCode).toBe(302);
    const location = res.headers.location;
    courseId = location.split("/").filter(Boolean).pop();
    expect(courseId).toBeDefined();
  });

  test("Educator Edits Course", async () => {
    const res = await request(app)
      .post(`/courses/${courseId}`)
      .set("Cookie", educatorSession)
      .send({ coursename: "Physics 101 - Updated" });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Adds Chapter", async () => {
    const res = await request(app)
      .post(`/my-courses/${courseId}/my-chapters`)
      .set("Cookie", educatorSession)
      .send({ chaptername: "Kinematics", description: "Basics of motion" });

    expect(res.statusCode).toBe(302);
    const location = res.headers.location;
    chapterId = location.split("/").filter(Boolean).pop();
    expect(chapterId).toBeDefined();
  });

  test("Educator Adds Page", async () => {
    const res = await request(app)
      .post(`/my-chapter/${chapterId}/my-pages`)
      .set("Cookie", educatorSession)
      .send({
        title: "Displacement vs Distance",
        content: "Motion details",
        chapterId: chapterId,
      });

    expect(res.statusCode).toBe(302);

    // ✅ Get the most recent page from DB instead
    const latestPage = await Page.findOne({
      where: { chapterId },
      order: [["createdAt", "DESC"]],
    });

    pageId = latestPage.id;
    expect(pageId).toBeDefined();
  });

  test("Educator Edits Chapter", async () => {
    const res = await request(app)
      .post(`/chapters/${chapterId}`)
      .set("Cookie", educatorSession)
      .send({ chaptername: "Kinematics Revised", description: "Updated info" });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Edits Page", async () => {
    const res = await request(app)
      .post(`/pages/${pageId}/edit`)
      .set("Cookie", educatorSession)
      .send({ title: "Updated Title", content: "Updated content" });

    expect(res.statusCode).toBe(302);
  });

  test("Educator Deletes Page", async () => {
    const res = await request(app)
      .post(`/pages/${pageId}/delete`)
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
  });

  test("Educator Deletes Chapter", async () => {
    const res = await request(app)
      .post(`/chapters/${chapterId}/delete`)
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
  });

  test("Educator Deletes Course", async () => {
    const res = await request(app)
      .post(`/courses/${courseId}/delete`)
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
  });

  test("Educator Views Reports", async () => {
    const res = await request(app)
      .get("/educator/viewreport")
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Course Enrollment Report"); // Make sure your EJS view includes something like "Report"
  });

  test("Educator Logout", async () => {
    const res = await request(app)
      .get("/logout")
      .set("Cookie", educatorSession);

    expect(res.statusCode).toBe(302);
  });
});

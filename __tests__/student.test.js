const request = require("supertest");
const app = require("../app");
const { sequelize, User, UserCourses } = require("../models");

let studentSession, studentId;

describe("Student Suite", () => {
  test("Student Sign Up", async () => {
    await request(app).post("/userssignup").send({
      role: "student",
      firstname: "John",
      lastname: "Student",
      email: "john@student.com",
      password: "student123",
    });

    const student = await User.findOne({
      where: { email: "john@student.com" },
    });
    studentId = student.id;
  });

  test("Student Sign In", async () => {
    const res = await request(app).post("/userssignin").send({
      role: "student",
      email: "john@student.com",
      password: "student123",
    });

    studentSession = res.headers["set-cookie"];
    expect(res.statusCode).toBe(302);
  });

  test("Student Update Password", async () => {
    const res = await request(app)
      .post(`/changepassword/${studentId}`)
      .set("Cookie", studentSession)
      .send({
        currentPassword: "student123",
        newPassword: "studypass456",
      });

    expect(res.statusCode).toBe(302);
  });

  test("Student Views Course List", async () => {
    const res = await request(app)
      .get("/student")
      .set("Cookie", studentSession);

    expect(res.statusCode).toBe(200);
  });

  test("Student Enrolls in Course", async () => {
    const course = await request(app)
      .get("/student")
      .set("Cookie", studentSession);

    const courseIdMatch = course.text.match(/\/enroll\/(\d+)/);
    const courseId = courseIdMatch && courseIdMatch[1];

    const res = await request(app)
      .post(`/enroll/${courseId}`)
      .set("Cookie", studentSession);

    expect(res.statusCode).toBe(302);
  });

  test("Student Views Course Content", async () => {
    const courses = await UserCourses.findAll({ where: { userId: studentId } });
    const enrolledCourse = courses[0];

    const res = await request(app)
      .get(`/student/courses/${enrolledCourse.courseId}/chapters`)
      .set("Cookie", studentSession);

    expect(res.statusCode).toBe(200);
  });

  test("Student Marks Page Complete", async () => {
    const res = await request(app)
      .post("/markcomplete")
      .set("Cookie", studentSession)
      .send({ pageId: 1 });

    expect(res.statusCode).toBe(200);
  });

  test("Student Views Enrolled Courses", async () => {
    const res = await request(app)
      .get("/student/enrolled")
      .set("Cookie", studentSession);

    expect(res.statusCode).toBe(200);
  });

  test("Student Logout", async () => {
    const res = await request(app).get("/logout").set("Cookie", studentSession);

    expect(res.statusCode).toBe(302);
  });
});

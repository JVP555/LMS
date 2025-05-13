// /* eslint-disable no-undef */
// /* eslint-disable no-unused-vars */
// const request = require("supertest");
// const app = require("../app");
// const {
//   sequelize,
//   User,
//   UserCourses,
//   Course,
//   Chapter,
//   Page,
//   PageCompletion,
// } = require("../models");

// let studentSession, studentId, testCourseId, testChapterId, testPageId;

// beforeAll(async () => {
//   await sequelize.sync({ force: true });

//   // Create educator and course
//   const educator = await User.create({
//     role: "educator",
//     firstname: "Alice",
//     lastname: "Educator",
//     email: "educator@test.com",
//     password: "educator123",
//   });

//   const course = await Course.create({
//     coursename: "Test Course",
//     description: "A course for testing",
//     userId: educator.id,
//   });

//   testCourseId = course.id;

//   const chapter = await Chapter.create({
//     chaptername: "Intro",
//     description: "Intro chapter",
//     courseId: testCourseId,
//   });

//   testChapterId = chapter.id;

//   const page = await Page.create({
//     title: "Page 1",
//     content: "Page 1 content",
//     chapterId: testChapterId,
//   });

//   testPageId = page.id;
// });

// describe("Student Suite", () => {
//   test("Student Sign Up", async () => {
//     const res = await request(app).post("/userssignup").send({
//       role: "student",
//       firstname: "John",
//       lastname: "Student",
//       email: "john@student.com",
//       password: "student123",
//     });
//     expect(res.statusCode).toBe(302);

//     const student = await User.findOne({
//       where: { email: "john@student.com" },
//     });
//     studentId = student.id;
//   });

//   test("Student Sign In", async () => {
//     const res = await request(app).post("/userssignin").send({
//       role: "student",
//       email: "john@student.com",
//       password: "student123",
//     });

//     studentSession = res.headers["set-cookie"];
//     expect(res.statusCode).toBe(302);
//   });

//   test("Student Changes Password", async () => {
//     const res = await request(app)
//       .post(`/changepassword/${studentId}`)
//       .set("Cookie", studentSession)
//       .send({
//         currentPassword: "student123",
//         newPassword: "studypass456",
//       });

//     expect(res.statusCode).toBe(302);
//   });

//   test("Student Views Course List (Dashboard)", async () => {
//     const res = await request(app)
//       .get("/Student")
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(200);
//     expect(res.text).toContain("Test Course");
//   });

//   test("Student Enrolls in a Course", async () => {
//     const res = await request(app)
//       .post(`/enroll/${testCourseId}`)
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(302);
//   });

//   test("Student Views Course Chapters", async () => {
//     const res = await request(app)
//       .get(`/student/courses/${testCourseId}/chapters`)
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(200);
//     expect(res.text).toContain("Intro");
//   });

//   test("Student Views Chapter Pages", async () => {
//     const res = await request(app)
//       .get(`/student/chapters/${testChapterId}/pages`)
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(200);
//     expect(res.text).toContain("Page 1");
//   });

//   test("Student Views Page Content", async () => {
//     const res = await request(app)
//       .get(`/student/page/${testPageId}`)
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(200);
//     expect(res.text).toContain("Page 1 content");
//   });

//   test("Student Marks Page as Complete", async () => {
//     const res = await request(app)
//       .post(`/student/markCompleted/${testPageId}`)
//       .set("Cookie", studentSession);

//     expect(res.statusCode).toBe(302);
//     const completion = await PageCompletion.findOne({
//       where: { userId: studentId, pageId: testPageId },
//     });
//     expect(completion).not.toBeNull();
//   });

//   test("Student Logout", async () => {
//     const res = await request(app).get("/logout").set("Cookie", studentSession);
//     expect(res.statusCode).toBe(302);
//   });
// });

// afterAll(async () => {
//   await sequelize.close();
// });

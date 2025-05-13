/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const path = require("path");
const { User, Course, Chapter, Page, UserCourses } = require("./models");
const { Op } = require("sequelize");
const { title } = require("process");
const chapter = require("./models/chapter");
const Sequelize = require("sequelize");
const PageCompletion = require("./models").PageCompletion;

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(flash());

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware: Role-based and logged-in checks
function ensureRole(role) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.role === role) return next();
    res.redirect("/signin");
  };
}

function ensureLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/signin");
}

// Routes

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      `/${req.session.user.role === "educator" ? "Educator" : "Student"}`
    );
  }

  res.render("index", {
    title: "LMS",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

// Auth: Sign Up
app.get("/signup", (req, res) => {
  res.render("signup", {
    title: "Sign Up",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

app.post("/userssignup", async (req, res) => {
  const { role, firstname, lastname, email, password } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      req.flash("error", "Email already in use.");
      return res.redirect("/signup");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      role,
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });

    req.session.user = newUser;
    res.redirect(`/${newUser.role === "educator" ? "Educator" : "Student"}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during registration.");
    res.redirect("/signup");
  }
});

// Auth: Sign In
app.get("/signin", (req, res) => {
  res.render("signin", {
    title: "Sign In",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

app.post("/userssignin", async (req, res) => {
  const { email, password, role } = req.body;

  if (!role || (role !== "educator" && role !== "student")) {
    req.flash("error", "Please select a valid role.");
    return res.redirect("/signin");
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/signin");
    }

    if (user.role !== role) {
      req.flash(
        "error",
        `This email is registered as a ${user.role}.\nPlease select the correct role.`
      );
      return res.redirect("/signin");
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.redirect(`/${user.role === "educator" ? "Educator" : "Student"}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during login.");
    res.redirect("/signin");
  }
});

// Educator Dashboard
app.get("/Educator", ensureRole("educator"), async (req, res) => {
  const courses = await Course.findAll({
    include: {
      model: User,
      attributes: ["firstname", "lastname"],
    },
  });

  // Get enrollment counts for all courses
  const enrollments = await UserCourses.findAll({
    attributes: [
      "courseId",
      [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
    ],
    group: ["courseId"],
    raw: true,
  });

  const enrollmentMap = {};
  enrollments.forEach((e) => {
    enrollmentMap[e.courseId] = parseInt(e.count);
  });

  res.render("educator", {
    title: "Educator Dashboard",
    user: req.session.user,
    courses,
    enrollmentMap, // <- pass it
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

app.get("/changepassword/:userId", ensureLoggedIn, async (req, res) => {
  const { userId } = req.params;

  // Ensure the user is changing their own password
  if (parseInt(userId) !== req.session.user.id) {
    req.flash("error", "Unauthorized access.");
    return res.redirect("/");
  }

  res.render("change-password", {
    title: "Change Password",
    user: req.session.user,
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

app.post("/changepassword/:userId", ensureLoggedIn, async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (parseInt(userId) !== req.session.user.id) {
    req.flash("error", "Unauthorized access.");
    return res.redirect("/");
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect(`/changepassword/${userId}`);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect(`/changepassword/${userId}`);
    }

    const isNewSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isNewSameAsCurrent) {
      req.flash(
        "error",
        "New password must be different from the current password."
      );
      return res.redirect(`/changepassword/${user.id}`);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedNewPassword });

    req.flash("success", "Password changed successfully.");

    // ✅ Redirect based on user role
    const redirectPath =
      req.session.user.role === "educator" ? "/educator" : "/student";
    return res.redirect(redirectPath);
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while changing password.");
    res.redirect(`/changepassword/${userId}`);
  }
});

// Course Creation
app.get("/courses/new", ensureRole("educator"), (req, res) => {
  res.render("create-course", {
    title: "Create Course",
    user: req.session.user,
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

app.post("/courses", ensureRole("educator"), async (req, res) => {
  const { coursename } = req.body;
  try {
    const newCourse = await Course.create({
      coursename,
      userId: req.session.user.id,
    });
    req.flash("success", "Course created successfully.");
    res.redirect(`/newchapter/${newCourse.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create course.");
    res.redirect("/courses/new");
  }
});

// Chapter Creation
app.get("/newchapter/:courseId", ensureRole("educator"), (req, res) => {
  res.render("create-chapter", {
    title: "Create New Chapter",
    chapter: null,
    courseId: req.params.courseId,
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

app.post("/newchapter/:courseId", ensureRole("educator"), async (req, res) => {
  const { chaptername, description } = req.body;
  const courseId = req.params.courseId;

  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      req.flash("error", "Course not found.");
      return res.redirect(`/newchapter/${courseId}`);
    }

    const chapter = await Chapter.create({
      chaptername,
      description,
      courseId,
    });
    req.flash("success", "Chapter created successfully.");
    res.redirect(`/newpage/${chapter.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create chapter.");
    res.redirect(`/newchapter/${courseId}`);
  }
});

// Page Creation
app.get("/newpage/:chapterId", ensureRole("educator"), (req, res) => {
  res.render("create-page", {
    title: "Create New Page",
    page: {},
    chapterId: req.params.chapterId,
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

app.post("/newpage/:chapterId", ensureRole("educator"), async (req, res) => {
  const { title, content } = req.body;
  const chapterId = req.params.chapterId;

  try {
    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      req.flash("error", "Chapter not found.");
      return res.redirect(`/newpage/${chapterId}`);
    }

    const page = await Page.create({ title, content, chapterId });
    req.flash("success", "Page created successfully.");
    res.redirect(`/page/${page.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create page.");
    res.redirect(`/newpage/${chapterId}`);
  }
});

// Page View
app.get("/page/:pageId", ensureLoggedIn, async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId, {
      include: [{ model: Chapter, include: [Course] }],
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/");
    }

    // Find the next page in the same chapter
    const nextPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.gt]: Number(pageId) },
      },
      order: [["id", "ASC"]],
    });

    // Find the previous page in the same chapter
    const prevPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.lt]: Number(pageId) },
      },
      order: [["id", "DESC"]],
    });

    res.render("educator-pageview", {
      title: page.title,
      user: req.session.user,
      page,
      nextPage,
      prevPage, // Include this in the render context
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while loading the page.");
    res.redirect("/");
  }
});

// Mark Page Completed
app.post("/markCompleted/:pageId", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId);
    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/");
    }

    page.completed = !page.completed;
    await page.save();

    req.flash("success", "Page marked as completed.");
    res.redirect(`/page/${pageId}`);
  } catch (err) {
    console.error(err);
    req.flash(
      "error",
      "An error occurred while marking the page as completed."
    );
    res.redirect(`/page/${pageId}`);
  }
});
app.get("/courses/:courseId/chapters", ensureLoggedIn, async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const chapters = await Chapter.findAll({ where: { courseId } });
    const course = await Course.findByPk(courseId);
    res.render("educator-chapter", {
      title: "Chapters",
      course,
      chapters,
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load chapters.");
    res.redirect("/Educator");
  }
});

// Already present in your code:
app.get("/chapters/:chapterId/pages", ensureLoggedIn, async (req, res) => {
  const chapterId = req.params.chapterId;
  try {
    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      req.flash("error", "Chapter not found.");
      return res.redirect("/Educator");
    }

    const pages = await Page.findAll({ where: { chapterId } });

    res.render("educator-page", {
      title: "Pages",
      chapter,
      pages,
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load pages.");
    res.redirect("/Educator");
  }
});

app.get("/my-courses", ensureLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch all courses created by the educator
    const myCourses = await Course.findAll({
      where: { userId },
    });

    // Fetch enrollment counts for these courses
    const enrollments = await UserCourses.findAll({
      where: {
        courseId: myCourses.map((course) => course.id),
      },
      attributes: [
        "courseId",
        [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
      ],
      group: ["courseId"],
      raw: true,
    });

    const enrollmentMap = {};
    enrollments.forEach((e) => {
      enrollmentMap[e.courseId] = parseInt(e.count);
    });

    // Render the view with enrollment counts
    res.render("educator-course", {
      title: "My Courses",
      courses: myCourses,
      user: req.session.user,
      enrollmentMap, // <- pass this to view
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Error fetching your courses.");
    res.redirect("/Educator");
  }
});

// Edit Course Route (GET)
app.get("/courses/:courseId/edit", ensureRole("educator"), async (req, res) => {
  const courseId = req.params.courseId;
  const redirectTo = req.query.redirectTo || "/Educator"; // default if not given

  try {
    const course = await Course.findByPk(courseId);
    if (!course || course.userId !== req.session.user.id) {
      req.flash("error", "You cannot edit this course.");
      return res.redirect(redirectTo);
    }

    res.render("create-course", {
      title: "Edit Course",
      course,
      courseId,
      redirectTo,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load course for editing.");
    res.redirect(redirectTo); // redirecting back to where the user was
  }
});

// Update Course Route (POST)
app.post("/courses/:courseId", ensureRole("educator"), async (req, res) => {
  const courseId = req.params.courseId;
  const { coursename } = req.body;
  const redirectTo = req.query.redirectTo || "/Educator"; // <-- FIXED

  try {
    const course = await Course.findByPk(courseId);
    if (!course || course.userId !== req.session.user.id) {
      req.flash("error", "You cannot edit this course.");
      return res.redirect(redirectTo); // redirect to the correct page
    }

    await course.update({ coursename });
    req.flash("success", "Course updated successfully.");
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update course.");
    res.redirect(`/courses/${courseId}/edit?redirectTo=${redirectTo}`); // sending back to the edit form
  }
});

// Delete Course Route (POST)
app.post(
  "/courses/:courseId/delete",
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;
    let redirectTo = req.query.redirectTo || "/Educator"; // Default to Educator dashboard

    // Make sure the redirectTo is a safe, relative path
    if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
      redirectTo = "/Educator"; // Fallback if the redirectTo is unsafe
    }

    try {
      const course = await Course.findByPk(courseId);
      if (!course || course.userId !== req.session.user.id) {
        req.flash("error", "You cannot delete this course.");
        return res.redirect(redirectTo); // Redirect back to safe location
      }
      await course.destroy();
      req.flash("success", "Course deleted successfully.");
      res.redirect(redirectTo); // Redirect after successful deletion
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete course.");
      res.redirect(redirectTo); // Redirect back to safe location in case of failure
    }
  }
);

// My Chapters (Educator)
app.get("/my-chapters/:courseId", ensureRole("educator"), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findByPk(courseId);

    if (!course) {
      req.flash("error", "Course not found.");
      return res.redirect("/Educator");
    }

    const chapters = await Chapter.findAll({
      where: { courseId },
    });

    res.render("educator-chapter", {
      title: "My Chapters",
      course,
      chapters,
      user: req.session.user,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error fetching your chapters.");
    res.redirect("/Educator");
  }
});

app.get(
  "/my-courses/:courseId/my-chapters/new",
  ensureLoggedIn,
  ensureRole("educator"),
  (req, res) => {
    const courseId = req.params.courseId;
    res.render("create-chapter", {
      title: "Create Chapter",
      courseId: courseId,
      chapter: null,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      }, // Add this to ensure chapter is always defined
    });
  }
);
app.post(
  "/my-courses/:courseId/my-chapters",
  ensureLoggedIn,
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;
    try {
      const { chaptername, description } = req.body;

      // Add logic to create a new chapter in the database
      const chapter = await Chapter.create({
        courseId: courseId,
        chaptername: chaptername,
        description: description,
      });
      res.redirect(`/my-chapters/${courseId}`);
      // Redirect to the passed redirect URL or default to the course chapters page
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to create chapter.");
      res.redirect(`/my-chapters/${courseId}`);
    }
  }
);

// Edit Chapter Form
app.get(
  "/chapters/:chapterId/edit",
  ensureRole("educator"),
  async (req, res) => {
    try {
      const { chapterId } = req.params;

      const chapter = await Chapter.findByPk(chapterId, {
        include: [{ model: Course }],
      });

      if (!chapter || chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot edit this chapter.");
        return res.redirect("/educator");
      }

      const courseId = chapter.Course.id;

      res.render("create-chapter", {
        title: "Edit Chapter",
        chapter,
        courseId,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load chapter for editing.");
      res.redirect("/educator");
    }
  }
);

// Update Chapter
app.post("/chapters/:chapterId", ensureRole("educator"), async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { chaptername, description } = req.body;

    const chapter = await Chapter.findByPk(chapterId, {
      include: [{ model: Course }],
    });

    if (!chapter || chapter.Course.userId !== req.session.user.id) {
      req.flash("error", "You cannot edit this chapter.");
      return res.redirect("/educator");
    }

    await chapter.update({ chaptername, description });

    const courseId = chapter.Course.id;
    req.flash("success", "Chapter updated successfully.");
    res.redirect(`/my-chapters/${courseId}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update chapter.");
    res.redirect("/educator");
  }
});

// Handle Chapter Deletion
app.post(
  "/chapters/:chapterId/delete",
  ensureRole("educator"),
  async (req, res) => {
    const { chapterId } = req.params;
    const redirectTo = req.query.redirectTo || "/my-chapters";

    // Validate the redirect URL
    if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
      return res.redirect("/my-chapters");
    }

    try {
      const chapter = await Chapter.findByPk(chapterId, {
        include: [{ model: Course }],
      });

      // Ensure the chapter exists and belongs to the logged-in educator
      if (!chapter || chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot delete this chapter.");
        return res.redirect(redirectTo);
      }

      // Delete the chapter
      await chapter.destroy();
      req.flash("success", "Chapter deleted successfully.");
      res.redirect(redirectTo);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete chapter.");
      res.redirect(redirectTo);
    }
  }
);
//pagessss
app.get(
  "/my-chapters/:chapterId/my-pages",
  ensureRole("educator"),
  async (req, res) => {
    const chapterId = req.params.chapterId;

    try {
      const chapter = await Chapter.findByPk(chapterId, {
        include: [Course],
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Educator");
      }

      const pages = await Page.findAll({ where: { chapterId } });

      res.render("educator-page", {
        title: "My Pages",
        chapter,
        pages,
        user: req.session.user,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load pages.");
      res.redirect("/Educator");
    }
  }
);

app.get(
  "/my-chapter/:chapterId/my-pages/new",
  ensureRole("educator"),
  async (req, res) => {
    const chapterId = req.params.chapterId;
    try {
      const chapter = await Chapter.findByPk(chapterId);
      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Educator");
      }

      res.render("create-page", {
        title: "Create Page",
        page: {},
        chapterId,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading the create page form.");
      res.redirect("/Educator");
    }
  }
);
app.post(
  "/my-chapter/:chapterId/my-pages",
  ensureRole("educator"),
  async (req, res) => {
    const { title, content } = req.body;
    const chapterId = req.params.chapterId;

    try {
      const chapter = await Chapter.findByPk(chapterId);
      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect(`/my-chapter/${chapterId}/my-pages/new`);
      }

      const page = await Page.create({
        title,
        content,
        chapterId,
      });

      req.flash("success", "Page created successfully.");
      res.redirect(`/my-chapters/${chapterId}/my-pages`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to create page.");
      res.redirect(`/my-chapter/${chapterId}/my-pages/new`);
    }
  }
);

// Edit Page Route (GET)
app.get("/pages/:pageId/edit", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId);
    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Educator");
    }

    res.render("create-page", {
      title: "Edit Page",
      page,
      user: req.session.user,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load page for editing.");
    res.redirect("/Educator");
  }
});

// Update Page Route (POST)
app.post("/pages/:pageId/edit", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  const { title, content } = req.body;

  try {
    const page = await Page.findByPk(pageId);

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Educator");
    }

    await page.update({ title, content });

    const chapterId = page.chapterId;

    req.flash("success", "Page updated successfully.");
    res.redirect(`/my-chapters/${chapterId}/my-pages`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update page.");
    res.redirect(`/pages/${pageId}/edit`);
  }
});

app.post("/pages/:pageId/delete", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  let redirectTo = req.query.redirectTo || "/Educator"; // fallback route

  // Validate redirectTo to be safe
  if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
    redirectTo = "/Educator";
  }

  try {
    const page = await Page.findByPk(pageId, {
      include: [{ model: Chapter }],
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect(redirectTo);
    }

    const courseOwnerId = await Course.findByPk(page.Chapter.courseId).then(
      (course) => course?.userId
    );

    if (courseOwnerId !== req.session.user.id) {
      req.flash("error", "You are not authorized to delete this page.");
      return res.redirect(redirectTo);
    }

    await page.destroy();
    req.flash("success", "Page deleted successfully.");
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to delete page.");
    res.redirect(redirectTo);
  }
});

//student

app.get("/Student", ensureRole("student"), async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch user's enrolled courses with educator info
    const user = await User.findByPk(userId, {
      include: {
        model: Course,
        as: "enrolledCourses",
        include: {
          model: User,
          attributes: ["firstname", "lastname"],
        },
      },
    });

    // Fetch all courses with educator info
    const allCourses = await Course.findAll({
      include: {
        model: User,
        attributes: ["firstname", "lastname"],
      },
    });

    // Enrollment count per course
    const enrollments = await UserCourses.findAll({
      attributes: [
        "courseId",
        [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
      ],
      group: ["courseId"],
      raw: true,
    });

    const enrollmentMap = {};
    enrollments.forEach((e) => {
      enrollmentMap[e.courseId] = parseInt(e.count);
    });

    const enrolledCourseIds = user.enrolledCourses.map((course) => course.id);

    // ✅ Fetch all pages and their courseIds via Chapter
    const allPages = await Page.findAll({
      include: {
        model: Chapter,
        attributes: ["courseId"],
      },
    });

    // Total pages per course
    const totalPagesPerCourse = {};
    allPages.forEach((page) => {
      const courseId = page.Chapter?.courseId;
      if (courseId) {
        totalPagesPerCourse[courseId] =
          (totalPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // ✅ Fetch user's completed pages with Chapter → courseId
    const completions = await PageCompletion.findAll({
      where: { userId },
      include: [
        {
          model: Page,
          include: {
            model: Chapter,
            attributes: ["courseId"],
          },
        },
      ],
    });

    // Completed pages per course
    const completedPagesPerCourse = {};
    completions.forEach((comp) => {
      const courseId = comp.Page?.Chapter?.courseId;
      if (courseId) {
        completedPagesPerCourse[courseId] =
          (completedPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // Completion percentage per course
    const completionPercentage = {};
    for (const courseId in totalPagesPerCourse) {
      const total = totalPagesPerCourse[courseId];
      const completed = completedPagesPerCourse[courseId] || 0;
      completionPercentage[courseId] = Math.round((completed / total) * 100);
    }

    // ✅ Render dashboard with progress info
    res.render("student", {
      title: "Student Dashboard",
      user: req.session.user,
      enrolledCourses: user.enrolledCourses,
      enrolledCourseIds,
      allCourses,
      enrollmentMap,
      completionPercentage, // <- pass to view
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error("Error loading student dashboard:", err);
    req.flash("error", "Failed to load dashboard.");
    res.redirect("/");
  }
});

app.post("/enroll/:courseId", ensureRole("student"), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user.id;
    const referer = req.get("referer");

    const existing = await UserCourses.findOne({ where: { userId, courseId } });
    if (existing) {
      req.flash("error", "Already enrolled in this course.");

      // Redirect back to referer if exists, else fallback
      return res.redirect(referer || `/student/courses/${courseId}/chapters`);
    }

    await UserCourses.create({ userId, courseId });
    req.flash("success", "Successfully enrolled in the course.");

    // Redirect back to referer if exists, else fallback
    return res.redirect(referer || `/student/courses/${courseId}/chapters`);
  } catch (err) {
    req.flash("error", "Enrollment failed.");
    res.redirect("/Student");
  }
});

app.get(
  "/student/courses/:courseId/chapters",
  ensureRole("student"),
  async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.session.user.id;

    try {
      const course = await Course.findByPk(courseId, {
        include: {
          model: User,
          attributes: ["firstname", "lastname"],
        },
      });

      if (!course) {
        req.flash("error", "Course not found.");
        return res.redirect("/Student");
      }

      const chapters = await Chapter.findAll({
        where: { courseId },
      });
      const allenrollments = await UserCourses.findAll({
        attributes: [
          "courseId",
          [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
        ],
        group: ["courseId"],
        raw: true,
      });

      // Convert the result into a dictionary: { courseId: count }
      const enrollmentMap = {};
      allenrollments.forEach((e) => {
        enrollmentMap[e.courseId] = parseInt(e.count);
      });

      // Fetch user's enrolled courses
      const enrollments = await UserCourses.findAll({ where: { userId } });

      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      res.render("student-chapter", {
        title: "Course Chapters",
        course,
        chapters,
        user: req.session.user,
        enrolledCourseIds,
        enrollmentMap, // ⬅️ required for template logic
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error("Failed to load chapters:", err);
      req.flash("error", "Failed to load chapters.");
      res.redirect("/Student");
    }
  }
);

app.get(
  "/student/chapters/:chapterId/pages",
  ensureRole("student"),
  async (req, res) => {
    try {
      const chapterId = req.params.chapterId;
      const userId = req.session.user.id;

      // Fetch the chapter and its course
      const chapter = await Chapter.findByPk(chapterId, {
        include: {
          model: Course,
          attributes: ["id", "coursename"],
        },
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Student");
      }

      const courseId = chapter.courseId;

      // Check if user is enrolled in the course
      const enrollment = await UserCourses.findOne({
        where: { userId, courseId },
      });

      if (!enrollment) {
        req.flash("error", "You are not enrolled in this course.");
        return res.redirect("/Student");
      }

      // Fetch pages of this chapter
      const pages = await Page.findAll({
        where: { chapterId },
        order: [["id", "ASC"]],
      });

      res.render("student-page", {
        title: "Pages",
        chapter: {
          id: chapter.id,
          chaptername: chapter.chaptername,
          description: chapter.description,
          courseId: chapter.courseId,
          coursename: chapter.Course?.coursename || "Course",
        },
        pages,
        user: req.session.user,
      });
    } catch (err) {
      console.error("Failed to load chapter pages:", err);
      req.flash("error", "Failed to load pages.");
      res.redirect("/Student");
    }
  }
);

app.get("/student/page/:id", ensureRole("student"), async (req, res) => {
  const pageId = req.params.id;
  const userId = req.session.user.id;

  try {
    const page = await Page.findByPk(pageId, {
      include: {
        model: Chapter,
        include: Course,
      },
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Student");
    }

    const chapter = page.Chapter;
    const course = chapter?.Course;

    // Check enrollment
    const enrolled = await UserCourses.findOne({
      where: { userId, courseId: course.id },
    });

    if (!enrolled) {
      req.flash("error", "You are not enrolled in this course.");
      return res.redirect("/Student");
    }

    // Get page list to determine prev/next
    const allPages = await Page.findAll({
      where: { chapterId: chapter.id },
      order: [["id", "ASC"]],
    });

    const index = allPages.findIndex((p) => p.id === page.id);
    const prevPage = index > 0 ? allPages[index - 1] : null;
    const nextPage = index < allPages.length - 1 ? allPages[index + 1] : null;

    // Check completion
    const completed = await PageCompletion.findOne({
      where: { userId, pageId },
    });

    res.render("student-pageview", {
      title: "Page View",
      page: {
        id: page.id,
        title: page.title,
        content: page.content,
        completed: !!completed,
      },
      ch: {
        id: chapter.id,
        chaptername: chapter.chaptername,
        courseId: course.id,
        coursename: course.coursename, // Add this line
      },
      prevPage,
      nextPage,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Page load error:", err);
    req.flash("error", "Unable to load page.");
    res.redirect("/Student");
  }
});

app.post(
  "/student/markCompleted/:id",
  ensureRole("student"),
  async (req, res) => {
    const pageId = req.params.id;
    const userId = req.session.user.id;

    try {
      const existing = await PageCompletion.findOne({
        where: { userId, pageId },
      });

      if (!existing) {
        await PageCompletion.create({ userId, pageId });
      }

      res.redirect("/student/page/" + pageId);
    } catch (err) {
      req.flash("error", "Could not mark page as completed.");
      res.redirect("/student/page/" + pageId);
    }
  }
);

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/signin");
});

module.exports = app;

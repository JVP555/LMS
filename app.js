/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const path = require("path");
const { User, Course, Chapter, Page } = require("./models");
const { Op } = require("sequelize");
const { title } = require("process");

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

  try {
    const user = await User.findOne({ where: { email } });
    const validPassword =
      user && (await bcrypt.compare(password, user.password));

    if (!user || !validPassword) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/signin");
    }

    req.session.user = user;
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

  res.render("educator", {
    title: "Educator Dashboard",
    user: req.session.user,
    courses,
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

// Student Dashboard
app.get("/Student", ensureRole("student"), (req, res) => {
  res.render("student", {
    title: "Student Dashboard",
    user: req.session.user,
  });
});

// Course Creation
app.get("/courses/new", ensureRole("educator"), (req, res) => {
  res.render("create-course", {
    title: "New Course",
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
    title: "Create Chapter",
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
    title: "Create Page",
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

    res.render("page", {
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
    res.render("chapters", {
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

app.get("/chapters/:chapterId/pages", ensureLoggedIn, async (req, res) => {
  const chapterId = req.params.chapterId;
  try {
    // Fetch the chapter to ensure it exists
    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      req.flash("error", "Chapter not found.");
      return res.redirect("/Educator");
    }

    // Fetch pages related to the chapter
    const pages = await Page.findAll({ where: { chapterId } });

    // Render the pages view with only the relevant pages of the chapter
    res.render("pages", { chapter, pages, user: req.session.user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load pages.");
    res.redirect("/Educator");
  }
});

app.get("/my-courses", ensureLoggedIn, async (req, res) => {
  try {
    const myCourses = await Course.findAll({
      where: {
        userId: req.session.user.id,
      },
    });
    res.render("courses", {
      title: "My Courses",
      courses: myCourses,
      user: req.session.user,
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

    res.render("chapters", {
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

app.post(
  "/my-courses/:courseId/my-chapters",
  ensureLoggedIn,
  ensureRole("educator"),
  async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const { chaptername, description, redirectTo } = req.body;

      // Add logic to create a new chapter in the database
      const chapter = await Chapter.create({
        courseId: courseId,
        chaptername: chaptername,
        description: description,
      });

      // Redirect to the passed redirect URL or default to the course chapters page
      if (redirectTo) {
        return res.redirect(redirectTo);
      } else {
        return res.redirect(`/my-courses/${courseId}/my-chapters`);
      }
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to create chapter.");
      res.redirect(`/my-courses/${courseId}/my-chapters/new`);
    }
  }
);

app.get(
  "/my-courses/:courseId/my-chapters/new",
  ensureLoggedIn,
  ensureRole("educator"),
  (req, res) => {
    const courseId = req.params.courseId;
    const redirectTo = req.query.redirectTo || null; // You can pass this as a query param
    res.render("create-chapter", {
      title: "Create New Chapter",
      courseId: courseId,
      chapter: null, // Add this to ensure chapter is always defined
      redirectTo: redirectTo, // Make sure redirectTo is passed
    });
  }
);

// Edit Chapter Form
app.get(
  "/chapters/:chapterId/edit",
  ensureRole("educator"),
  async (req, res) => {
    const { chapterId } = req.params;
    const redirectTo = req.query.redirectTo || "/my-chapters";

    try {
      const chapter = await Chapter.findByPk(chapterId, {
        include: [{ model: Course }],
      });

      // Check if chapter exists and belongs to the logged-in user
      if (!chapter || chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot edit this chapter.");
        return res.redirect(redirectTo);
      }

      res.render("create-chapter", {
        title: "Edit Chapter",
        chapter, // Pass the chapter object to the template
        courseId: chapter.Course.id, // Use Course ID to pass to the form
        redirectTo,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load chapter for editing.");
      res.redirect(redirectTo);
    }
  }
);

// Update Chapter
app.post("/chapters/:chapterId", ensureRole("educator"), async (req, res) => {
  const { chapterId } = req.params;
  const { chaptername, description } = req.body;
  const redirectTo = req.query.redirectTo || "/my-chapters";

  try {
    const chapter = await Chapter.findByPk(chapterId, {
      include: [{ model: Course }],
    });

    // Check if chapter exists and belongs to the logged-in user
    if (!chapter || chapter.Course.userId !== req.session.user.id) {
      req.flash("error", "You cannot edit this chapter.");
      return res.redirect(redirectTo);
    }

    // Update chapter details
    await chapter.update({ chaptername, description });
    req.flash("success", "Chapter updated successfully.");
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update chapter.");
    res.redirect(`/chapters/${chapterId}/edit?redirectTo=${redirectTo}`);
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

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/signin");
});

module.exports = app;

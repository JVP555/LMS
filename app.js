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
    where: { userId: req.session.user.id },
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
    res.render("chapters", { course, chapters, user: req.session.user });
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

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/signin");
});

module.exports = app;

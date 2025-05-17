/* eslint-disable no-unused-vars */
// Import middleware from router.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const {
  User,
  Course,
  Chapter,
  Page,
  UserCourses,
  PageCompletion,
} = require("../models");

const { ensureLoggedIn, ensureRole } = require("../middleware");
const { Op } = require("sequelize");
//________________________General_________________________________________________________-
router.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      `/${req.session.user.role === "educator" ? "Educator" : "Student"}`
    );
  }

  res.render("General/index", {
    title: "LMS",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

// Auth: Sign Up
router.get("/signup", (req, res) => {
  res.render("General/signup", {
    title: "Sign Up",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

router.post("/userssignup", async (req, res) => {
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
router.get("/signin", (req, res) => {
  res.render("General/signin", {
    title: "Sign In",
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

router.post("/userssignin", async (req, res) => {
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
      firstname: user.firstname,
      lastname: user.lastname,
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

router.get("/changepassword/:userId", ensureLoggedIn, async (req, res) => {
  const { userId } = req.params;

  // Ensure the user is changing their own password
  if (parseInt(userId) !== req.session.user.id) {
    req.flash("error", "Unauthorized access.");
    return res.redirect("/");
  }

  res.render("General/change-password", {
    title: "Change Password",
    user: req.session.user,
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
    showDashboardFeaturesstudent: false,
    showDashboardFeatures: false,
    breadcrumb: [
      { label: "Dashboard", href: "/" },
      { label: "Change Password" },
    ],
  });
});

router.post("/changepassword/:userId", ensureLoggedIn, async (req, res) => {
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

router.get("/search", async (req, res) => {
  const query = req.query.query?.trim();
  if (!query) return res.redirect(`/${req.session.user.role}`);

  try {
    const courses = await Course.findAll({
      where: {
        [Op.or]: [
          {
            coursename: {
              [Op.iLike]: `%${query}%`, // partial match on course title
            },
          },
          {
            userId: isNaN(query) ? -1 : parseInt(query), // match userId if query is a number
          },
        ],
      },
      include: [
        {
          model: User,
          attributes: ["firstname", "lastname"],
        },
      ],
    });

    res.render("General/search-results", {
      title: "Search Results",
      query,
      courses,
      user: req.session.user,
      showDashboardFeatures: true,
      showDashboardFeaturesstudent: false,
      breadcrumb: [
        { label: "Dashboard", href: `/${req.session.user.role}` },
        { label: "Search" },
      ],
      messages: {
        success: req.flash("success"),
        error: req.flash("error"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during the search.");
    res.redirect(`/${req.session.user.role}`);
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;

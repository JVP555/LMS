const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash"); // Use connect-flash here
const { User } = require("./models"); // Assuming you have a User model
const path = require("path");
const app = express();

// Middleware setup
app.use(express.static(path.join(__dirname, "public"))); // For static files (e.g., images, CSS)
app.use(bodyParser.json()); // For parsing JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // For parsing form data

// Session and Flash setup
app.use(
  session({
    secret: "your-secret-key", // Use a strong secret key here
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    },
  })
);

app.use(flash()); // Use connect-flash here

// Setting EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  // Check if the user is logged in and has a role
  if (req.session.user) {
    // Redirect to the respective page based on the user's role
    if (req.session.user.role === "educator") {
      return res.redirect("/Educator");
    } else if (req.session.user.role === "student") {
      return res.redirect("/Student");
    }
  }

  // If no user is logged in, render the index page as usual
  res.render("index", {
    title: "LMS",
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

// Route for the signup page
app.get("/signup", (req, res) => {
  res.render("signup", {
    title: "Sign Up",
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

// Handle the signup form submission
app.post("/userssignup", async (req, res) => {
  const { role, firstname, lastname, email, password } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      req.flash("error", "Email already in use.");
      return res.redirect("/signup");
    }

    // Create new user
    const newUser = await User.create({
      role,
      firstname,
      lastname,
      email,
      password, // Make sure to hash the password in real applications
    });

    req.flash("success", "Registration successful!");

    // Set user session
    req.session.user = newUser;

    // Redirect based on role after signup
    if (newUser.role === "educator") {
      res.redirect("/Educator");
    } else if (newUser.role === "student") {
      res.redirect("/Student");
    } else {
      req.flash("error", "Please select a valid role.");
      res.redirect("/signup");
    }
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during registration.");
    res.redirect("/signup");
  }
});

// Route for the signin page
app.get("/signin", (req, res) => {
  res.render("signin", {
    title: "Sign In",
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

// Handle the signin form submission
app.post("/userssignin", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || user.password !== password) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/signin");
    }

    req.session.user = user;

    if (role === "educator") {
      res.redirect("/Educator");
    } else if (role === "student") {
      res.redirect("/Student");
    } else {
      req.flash("error", "Please select a valid role.");
      res.redirect("/signin");
    }
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during login.");
    res.redirect("/signin");
  }
});

// Example of a protected route for Educators
app.get("/Educator", (req, res) => {
  if (!req.session.user || req.session.user.role !== "educator") {
    return res.redirect("/signin");
  }
  console.log("Logged-in user:", req.session.user); // 👈 Add this line
  res.render("educator", {
    title: "Educator Dashboard",
    user: req.session.user,
  });
});

// Example of a protected route for Students
app.get("/Student", (req, res) => {
  if (!req.session.user || req.session.user.role !== "student") {
    return res.redirect("/signin");
  }

  res.render("student", {
    title: "Student Dashboard",
    user: req.session.user, // Pass the logged-in user to the view
  });
});

// Route to log out
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Unable to log out.");
    }
    res.redirect("/");
  });
});

module.exports = app;

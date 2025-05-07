/* eslint-disable no-undef */
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { User } = require("./models"); // Make sure you have a User model set up

const app = express();

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));

// ===== Routes for rendering views =====
app.get("/", (req, res) => {
  res.render("index", { title: "LMS" });
});

app.get("/signin", (req, res) => {
  res.render("signin", { title: "SIGN IN" });
});

app.get("/signup", (req, res) => {
  res.render("signup", { title: "SIGN UP" });
});

app.get("/Educator", (req, res) => {
  res.render("ehome", { title: "EDUCATOR" });
});

app.get("/Student", (req, res) => {
  res.render("shome", { title: "STUDENT" });
});

app.get("/newcourse", (req, res) => {
  res.render("newcourse", { title: "CREATE NEW COURSE" });
});

// ===== Route: User Registration =====
app.post("/users", async (req, res) => {
  const { role, firstname, lastname, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      role,
      firstname,
      lastname,
      email,
      password: hashedPassword,
    });

    console.log(`New user created with ID: ${newUser.id}`);

    // Redirect based on user role
    res.status(201).redirect(role === "educator" ? "/Educator" : "/Student");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user");
  }
});

// ===== Route: User Login =====
app.post("/userssignin", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ where: { email, role } });

    if (!user) {
      return res.status(401).json({ error: "User not found or role mismatch" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Login successful
    res
      .status(200)
      .json({ redirect: role === "educator" ? "/Educator" : "/Student" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;

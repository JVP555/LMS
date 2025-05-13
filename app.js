/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const path = require("path");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

const {
  ensureLoggedIn,
  ensureEducator,
  ensureStudent,
} = require("./middleware");

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

app.use(flash());

// CSRF protection
app.use(csrf({ cookie: true }));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Make CSRF token and user info available in all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user;
  req.user = req.session.user; // <-- Add this line
  next();
});

// Route handlers
const generalRoutes = require("./routes/general");
const educatorRoutes = require("./routes/educator");
const studentRoutes = require("./routes/student");

app.use("/", generalRoutes);
app.use("/", educatorRoutes);
app.use("/", studentRoutes);

module.exports = app;

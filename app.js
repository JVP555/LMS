/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
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

const { sequelize } = require("./models"); // Sequelize instance

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Session setup
const sessionStore = new SequelizeStore({ db: sequelize });

app.use(
  session({
    secret: "your-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// Sync the session table
sessionStore.sync();

app.use(flash());

// CSRF protection
const csrfProtection = csrf({ cookie: true });

if (process.env.NODE_ENV !== "test") {
  app.use(csrfProtection);
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.user = req.session.user;
    req.user = req.session.user;
    next();
  });
} else {
  // Mock CSRF in test
  app.use((req, res, next) => {
    res.locals.csrfToken = "test-csrf-token";
    res.locals.user = req.session.user;
    req.user = req.session.user;
    next();
  });
}

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const generalRoutes = require("./routes/general");
const educatorRoutes = require("./routes/educator");
const studentRoutes = require("./routes/student");

app.use("/", generalRoutes);
app.use("/", educatorRoutes);
app.use("/", studentRoutes);

module.exports = app;

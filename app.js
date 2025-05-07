const express = require("express");
const path = require("path");

const app = express();

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Points to your views/ folder

// Optional: for serving CSS/images if needed
app.use(express.static(path.join(__dirname, "public")));

// Route to render index.ejs
app.get("/", (req, res) => {
  res.render("index", { title: "LMS" });
});
// Route to render signin.ejs
app.get("/signin", (req, res) => {
  res.render("signin", { title: "SIGN IN" });
});
// Route to render signin.ejs
app.get("/signup", (req, res) => {
  res.render("signup", { title: "SIGN UP" });
});

module.exports = app;

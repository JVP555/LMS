const express = require("express");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const { Todo, User } = require("./models");
const { title } = require("process");

const app = express();

// Middleware setup
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser("shh secret"));
app.use(csrf({ cookie: true }));
app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const saltRounds = 10;

app.use(
  session({
    secret: "secret",
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async function (user) {
          if (!user) {
            return done(null, false, {
              message: "No user found with that email",
            });
          }
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      return done(null, user);
    })
    .catch((err) => {
      return done(err, null);
    });
});

app.set("view engine", "ejs");

app.get("/", (request, response) => {
  if (request.isAuthenticated()) {
    return response.redirect("/todos");
  }
  response.render("index", {
    title: "Todo Application",
    csrfToken: request.csrfToken(),
  });
});

// Home route - renders categorized todos
app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const loggedInUser = request.user.id;
      const overdue = await Todo.overdue(loggedInUser);
      const dueToday = await Todo.dueToday(loggedInUser);
      const dueLater = await Todo.dueLater(loggedInUser);
      const completedTodo = await Todo.completedTodo(loggedInUser);

      if (request.accepts("html")) {
        response.render("todos", {
          title: "Todo Application",
          overdue,
          dueToday,
          dueLater,
          completedTodo,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          overdue,
          dueToday,
          dueLater,
          completedTodo,
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).send("Something went wrong");
    }
  }
);

app.post("/users", async (request, response) => {
  const { firstName, lastName, email, password } = request.body;

  // Validate required fields
  if (!firstName || !email || !password) {
    request.flash("error", "Please fill in all required fields.");
    return response.redirect("/signup");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    request.login(user, (err) => {
      if (err) {
        console.log(err);
        request.flash("error", "Login failed after signup.");
        return response.redirect("/signup");
      }
      response.redirect("/todos");
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "Error creating user.");
    response.redirect("/signup");
  }
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Sign Up",
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/todos");
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});
// Add new todo
app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const { title, dueDate } = request.body;
      const userId = request.user.id;

      if (!title || !dueDate) {
        return response
          .status(422)
          .json({ error: "Title and due date are required" });
      }

      const todo = await Todo.addTodo({ title, dueDate, userId });

      if (request.accepts("html")) {
        return response.redirect("/todos");
      } else {
        return response.json(todo);
      }
    } catch (error) {
      console.log(error);
      return response
        .status(422)
        .json({ error: "Failed to create todo", details: error });
    }
  }
);

// Get all todos (API only)
app.get(
  "/api/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todos = await Todo.findAll({ where: { userId: request.user.id } });

      if (!todos || todos.length === 0) {
        return response.status(404).json({ message: "No todos found" });
      }

      return response.json(todos);
    } catch (error) {
      console.log(error);
      return response
        .status(422)
        .json({ error: "Failed to fetch todos", details: error });
    }
  }
);

// Get specific todo by ID
app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.findOne({
        where: {
          id: request.params.id,
          userId: request.user.id,
        },
      });

      if (!todo) {
        return response.status(404).json({ message: "Todo not found" });
      }

      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response
        .status(422)
        .json({ error: "Failed to fetch todo", details: error });
    }
  }
);

// Update todo completion status
app.post(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const todo = await Todo.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      if (req.body._method === "PUT") {
        await todo.setCompletionStatus(req.body.completed);

        if (req.accepts("html")) {
          return res.redirect("/todos");
        } else {
          return res.json(todo);
        }
      } else {
        return res.status(400).json({ error: "Invalid method" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to update todo" });
    }
  }
);

// Delete a todo
// Delete a todo using POST
app.post(
  "/todos/:id/delete",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const todo = await Todo.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      // Perform the deletion
      await Todo.remove(req.params.id, req.user.id);

      if (req.accepts("html")) {
        return res.redirect("/todos");
      } else {
        return res.json(true);
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to delete todo" });
    }
  }
);
//jjjj
module.exports = app;

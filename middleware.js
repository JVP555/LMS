// middleware.js

function ensureLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/signin");
}

function ensureRole(role) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.role === role) return next();
    res.redirect("/signin");
  };
}

const ensureEducator = ensureRole("educator");
const ensureStudent = ensureRole("student");

module.exports = {
  ensureLoggedIn,
  ensureEducator,
  ensureStudent,
  ensureRole,
};

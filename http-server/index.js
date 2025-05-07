const http = require("http");
const fs = require("fs");
const minimist = require("minimist");

// Parse command-line arguments
const args = minimist(process.argv.slice(2));
const port = args.port || 5000; // Default port if not provided

// Store content in variables
let homeContent = "";
let projectContent = "";
let registrationContent = "";

// Read HTML files asynchronously
fs.readFile("home.html", (err, data) => {
  if (err) {
    console.error("Error reading home.html:", err);
    return;
  }
  homeContent = data;
});

fs.readFile("project.html", (err, data) => {
  if (err) {
    console.error("Error reading project.html:", err);
    return;
  }
  projectContent = data;
});

fs.readFile("registration.html", (err, data) => {
  if (err) {
    console.error("Error reading registration.html:", err);
    return;
  }
  registrationContent = data;
});

// Create the server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });

  switch (req.url) {
    case "/project":
      res.end(projectContent);
      break;
    case "/registration":
      res.end(registrationContent);
      break;
    case "/":
      res.end(homeContent);
      break;
    default:
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>404 - Not Found</h1>");
      break;
  }
});

// Start server with dynamic port
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const app = require("./app");
const { exec } = require("child_process");

// Start the server
const server = app.listen(3000, () => {
  console.log("Started express server at port 3000");
});

// Listen for SIGTSTP signal (Ctrl+Z)
process.on("SIGTSTP", () => {
  console.log("Received SIGTSTP, terminating process and killing the port...");

  // Run the command to kill the process on port 3000
  exec("lsof -ti:3000 | xargs kill -9", (err, stdout, stderr) => {
    if (err) {
      console.error(`Error executing command: ${err}`);
      return;
    }
    console.log(`Process killed successfully: ${stdout}`);
  });

  // Gracefully stop the server
  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
});

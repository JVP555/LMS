/* eslint-disable no-undef */
const app = require("./app");
const { exec } = require("child_process");

// Determine port from env or default to 3000
const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`Started express server at port ${PORT}`);
});

// Optional local port cleanup for SIGTSTP (CTRL+Z)
// Don't run this in production (like Render)
if (process.env.NODE_ENV !== "production") {
  process.on("SIGTSTP", () => {
    console.log(
      "Received SIGTSTP, terminating process and killing the port..."
    );

    // eslint-disable-next-line no-unused-vars
    exec(`lsof -ti:${PORT} | xargs kill -9`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error killing port: ${err}`);
        return;
      }
      console.log(`Process killed: ${stdout}`);
    });

    server.close(() => {
      console.log("Server stopped.");
      process.exit(0);
    });
  });
}

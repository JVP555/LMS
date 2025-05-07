const app = require("./app");

app.listen(3000, () => {
  console.log("Started express server at port 3000");
});

//lsof -ti:3000 | xargs kill -9

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

// MiddleWere
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello, from backend");
});

app.listen(port, () => {
  console.log("Responding to", port);
});

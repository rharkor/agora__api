const express = require("express");
require("dotenv").config();
const cors = require("cors");

const { connect } = require("./utils/database");

const authRouter = require("./routers/auth");

const app = express();
app.use(express.json());
app.use(cors());
const port = 3001;

app.get("/", (req, res) => {
  return res.send({
    status: "success",
  });
});

app.use("/", authRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  connect();
});

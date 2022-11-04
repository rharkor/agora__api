const express = require("express");
require("dotenv").config();
const cors = require("cors");
const webpush = require("web-push");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { connect } = require("./utils/database");

const authRouter = require("./routers/auth");
const notificationsRouter = require("./routers/notifications");

const app = express();
app.use(express.json());
app.use(cors());
const port = 3001;

webpush.setVapidDetails(
  "mailto: louis@huort.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

app.get("/", (req, res) => {
  return res.send({
    status: "success",
  });
});

app.post("/calendar", async (req, res) => {
  const url = `https://apps.univ-lr.fr/cgi-bin/WebObjects/ServeurPlanning.woa/wa/ics?login=${req.body.username}`;
  const data = await fetch(url);
  const blob = await data.blob();
  const text = await blob.text();
  return res.send(text);
});

app.use("/", authRouter);
app.use("/notifications", notificationsRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  connect();
});

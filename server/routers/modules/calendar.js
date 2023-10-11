const express = require("express");
const router = express.Router();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.post("/", async (req, res) => {
  const url = req.body.username;
  const data = await fetch(url);
  const blob = await data.blob();
  const text = await blob.text();
  return res.send(text);
});

module.exports = router;

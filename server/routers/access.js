const express = require("express");
const router = express.Router();

const { checkTokenMiddleware } = require("../middlewares/auth");
const { client } = require("../utils/database");

router.get("/get", checkTokenMiddleware, async (req, res) => {
  try {
    let user = await client.query(`SELECT * FROM users WHERE id = $1`, [
      req.body.id,
    ]);
    if (user.rows.length <= 0) {
      return res.status(401).json({ message: "Failed to find the user" });
    }
    user = user.rows[0];

    const accesReg = new RegExp(/.*_access/);

    let access = [];
    if (user.admin === true) {
      Object.entries(user).forEach(([key, value]) => {
        if (key.match(accesReg)) {
          access.push(key.replace("_access", ""));
        }
      });
    } else {
      Object.entries(user).forEach(([key, value]) => {
        if (key.match(accesReg) && value === true) {
          access.push(key.replace("_access", ""));
        }
      });
    }

    return res.json({
      status: "success",
      access,
    });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

module.exports = router;

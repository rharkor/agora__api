const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const { checkTokenMiddleware } = require("../middlewares/auth");
const { client } = require("../utils/database");

const haveAdmin = async () => {
  try {
    const result = await client.query(
      "SELECT * FROM users WHERE admin = true;"
    );
    if (result.rows.length > 0) {
      return true;
    }
  } catch (e) {
    console.error(e);
    return true;
  }
  return false;
};

router.get("/have-admin", async (req, res) => {
  return res.send({ haveAdmin: await haveAdmin() });
});

router.get("/connected", checkTokenMiddleware, (req, res) =>
  res.json({ status: "success" })
);

router.post("/login", async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        message: "Error. Please enter the correct email and password",
      });
    }
    const result = await client.query(
      "SELECT * FROM users WHERE email = lower($1) AND password = crypt($2, password);",
      [req.body.email, req.body.password]
    );
    if (result.rows.length <= 0) {
      return res.status(401).send({
        status: "failed",
        error: "No match",
      });
    }
    const token = jwt.sign(
      {
        id: result.rows[0].id,
        email: req.body.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15 days" }
    );

    const info = {
      email: result.rows[0].email,
      univUsername: result.rows[0].univusername,
      admin: result.rows[0].admin,
    };

    return res.json({
      access_token: token,
      status: "success",
      ...info,
    });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    if (!req.body.email || !req.body.univUsername || !req.body.password) {
      return res.status(400).json({
        message: "Error. Please enter the correct fields",
      });
    }

    if (req.body.password.length < 8) {
      throw "Password must be at least of 8 characters";
    }

    const numberOfUsers = parseInt(
      (await client.query("SELECT count(*) FROM users")).rows[0].count
    );
    const multipleUsers = (await client.query("SELECT multipleusers FROM info"))
      .rows[0].multipleusers;

    const isAdmin = !(await haveAdmin());

    if (!multipleUsers && numberOfUsers > 0 && !isAdmin) {
      throw "Cannot have multiple users";
    }

    const result = await client.query(
      "INSERT INTO users (email, univusername, password, admin) VALUES ($1, $2, crypt($3, gen_salt('bf', 8)), $4) RETURNING id;",
      [req.body.email, req.body.univUsername, req.body.password, isAdmin]
    );

    const token = jwt.sign(
      {
        id: result.rows[0].id,
        email: req.body.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15 days" }
    );

    const info = {
      email: req.body.email,
      univUsername: req.body.univUsername,
      admin: isAdmin,
    };

    return res.json({ access_token: token, status: "success", ...info });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});
router.post("/update-account", checkTokenMiddleware, async (req, res) => {
  try {
    if (
      !req.body.password ||
      !req.body.email ||
      !req.body.newUnivUsername ||
      !req.body.newEmail ||
      !req.body.newPassword
    ) {
      return res.status(400).json({
        message: "Error. Please enter the correct fields",
      });
    }

    if (req.body.password.length < 8) {
      throw "Password must be at least of 8 characters";
    }

    const result = await client.query(
      "UPDATE users SET email = $1, univUsername = $2, password = crypt($3, gen_salt('bf', 8)) WHERE email = lower($4) AND password = crypt($5, password) RETURNING id;",
      [
        req.body.newEmail,
        req.body.newUnivUsername,
        req.body.newPassword,
        req.body.email,
        req.body.password,
      ]
    );

    if (result.rows.length <= 0) {
      return res.status(401).json({
        status: "error",
        error: "No corresponding account found",
      });
    }

    if (req.body.newMultiAccount !== null) {
      const isAdmin = (
        await client.query("SELECT admin FROM users WHERE id = $1", [
          result.rows[0].id,
        ])
      ).rows[0].admin;
      if (!isAdmin) {
        throw "You are not an administrator";
      }

      await client.query("UPDATE info SET multipleusers = $1;", [
        req.body.newMultiAccount,
      ]);
    }

    return res.json({
      status: "success",
    });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

router.post("/delete-account", checkTokenMiddleware, async (req, res) => {
  try {
    if (!req.body.id) {
      return res.status(401).send({
        status: "failed",
        error: "Can't identify you",
      });
    }
    await client.query(`DELETE FROM notifications WHERE user_id = $1`, [
      req.body.id,
    ]);
    await client.query("DELETE FROM users WHERE users.id = $1", [req.body.id]);
    return res.send({
      status: "success",
    });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

router.get("/multiple-users", async (req, res) => {
  try {
    const multipleUsers = (await client.query("SELECT multipleusers FROM info"))
      .rows[0];

    res.json({
      status: "success",
      multipleUsers: multipleUsers.multipleusers,
    });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

router.post("/multiple-users", checkTokenMiddleware, async (req, res) => {
  try {
    if (!req.body.multipleUsers) {
      return res.status(400).json({
        message: "Error. Please enter the correct fields",
      });
    }

    await client.query(
      "UPDATE info SET multipleusers = $1 WHERE onerow_id = true",
      [req.body.multipleUsers]
    );

    res.json({
      status: "success",
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

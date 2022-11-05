const express = require("express");
const { isAdminMiddleware } = require("../middlewares/admin");
const router = express.Router();

const { checkTokenMiddleware } = require("../middlewares/auth");
const { client } = require("../utils/database");

router.get(
  "/get-users",
  checkTokenMiddleware,
  isAdminMiddleware,
  async (req, res) => {
    try {
      const page = isNaN(req.query.page) ? 0 : req.query.page;
      const rowCount = (await client.query("SELECT count(*) FROM users"))
        .rows[0].count;
      const users = await client.query(
        "SELECT * FROM users LIMIT 5 OFFSET $1",
        [page * 5]
      );

      return res.json({
        status: "success",
        users: users.rows.map((user) => {
          delete user.password;
          return user;
        }),
        rowCount,
      });
    } catch (e) {
      console.error(e);
      return res.status(401).send({
        status: "failed",
        error: e.toString(),
      });
    }
  }
);

router.post(
  "/update-users",
  checkTokenMiddleware,
  isAdminMiddleware,
  async (req, res) => {
    try {
      const users = req.body.users;
      if (!users) {
        throw "Need users field";
      }

      const allPromises = [];
      users.forEach((user) => {
        allPromises.push(
          client.query(
            `UPDATE users SET email = $2, univusername = $3, calendar_access = $4, megasql_access = $5 WHERE id = $1`,
            [
              user.id,
              user.email,
              user.univusername,
              user.calendar_access,
              user.megasql_access,
            ]
          )
        );
      });

      await Promise.all(allPromises);

      return res.json({ status: "success" });
    } catch (e) {
      console.error(e);
      return res.status(401).send({
        status: "failed",
        error: e.toString(),
      });
    }
  }
);

router.post(
  "/delete-users",
  checkTokenMiddleware,
  isAdminMiddleware,
  async (req, res) => {
    try {
      const users = req.body.users;
      if (!users) {
        throw "Need users field";
      }

      const allPromises = [];
      users.forEach((user) => {
        allPromises.push(
          (async () => {
            await client.query(`DELETE FROM notifications WHERE user_id = $1`, [
              user.id,
            ]);
            return await client.query(`DELETE FROM users WHERE id = $1`, [
              user.id,
            ]);
          })()
        );
      });

      await Promise.all(allPromises);

      return res.json({ status: "success" });
    } catch (e) {
      console.error(e);
      return res.status(401).send({
        status: "failed",
        error: e.toString(),
      });
    }
  }
);

module.exports = router;

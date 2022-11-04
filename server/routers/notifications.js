const express = require("express");
const webpush = require("web-push");
const router = express.Router();
const { checkTokenMiddleware } = require("../middlewares/auth");
const { client } = require("../utils/database");

router.post("/subscribe", checkTokenMiddleware, async (req, res) => {
  try {
    const { subscription, email, id } = req.body;
    if (!id || !email || !subscription) {
      return res
        .status(401)
        .json({ status: "error", error: "Need a subscription field" });
    }

    const notifications = await client.query(
      `SELECT * FROM notifications WHERE user_id = $1`,
      [id]
    );

    if (notifications.rows.length <= 0) {
      // console.log("new");
      await client.query(
        `INSERT INTO notifications(user_id, subscription_endpoint, subscription_keys, basic_notification)
      VALUES ($1, $2, $3, $4);`,
        [id, subscription.endpoint, JSON.stringify(subscription.keys), true]
      );
    } else if (
      notifications.rows[0].subscription_endpoint !== subscription.endpoint ||
      notifications.rows[0].subscription_keys !==
        JSON.stringify(subscription.keys)
    ) {
      // console.log("update");
      await client.query(
        `UPDATE notifications SET subscription_endpoint = $1, subscriptions_keys = $2`,
        [subscription.endpoint, JSON.stringify(subscription.keys)]
      );
    } else {
      // console.log("same");
    }

    res.status(200).json({ status: "success" });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

router.post("/notify-all", checkTokenMiddleware, async (req, res) => {
  try {
    const { title, description, icon } = req.body;

    if (!title || !description || !icon) {
      throw "Please specify a title, a description and an icon url";
    }

    const isAdmin = await client.query(
      "SELECT * FROM users WHERE admin = true AND id = $1;",
      [req.body.id]
    );

    if (isAdmin.rows.length <= 0) {
      throw "You need to be admin";
    }

    const allSubscribers = await client.query(
      `SELECT * FROM notifications WHERE basic_notification = true`
    );

    const payload = JSON.stringify({
      title,
      description,
      icon,
    });

    for (user of allSubscribers.rows) {
      const subscription = {
        endpoint: user.subscription_endpoint,
        keys: JSON.parse(user.subscription_keys),
        expirationTime: null,
      };
      await webpush
        .sendNotification(subscription, payload)
        .then((result) => console.log("notified:", user.id))
        .catch((e) => console.log(e));
    }

    return res.json({ status: "success" });
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
});

module.exports = router;

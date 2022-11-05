const express = require("express");
const webpush = require("web-push");
const { isAdminMiddleware } = require("../middlewares/admin");
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
      `SELECT * FROM notifications WHERE user_id = $1 AND subscription_endpoint = $2 AND subscription_keys = $3 AND basic_notification = $4`,
      [id, subscription.endpoint, JSON.stringify(subscription.keys), true]
    );

    if (notifications.rows.length <= 0) {
      // console.log("new");
      await client.query(
        `INSERT INTO notifications(user_id, subscription_endpoint, subscription_keys, basic_notification)
      VALUES ($1, $2, $3, $4);`,
        [id, subscription.endpoint, JSON.stringify(subscription.keys), true]
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

router.post(
  "/notify-all",
  checkTokenMiddleware,
  isAdminMiddleware,
  async (req, res) => {
    try {
      const { title, description, icon } = req.body;

      if (!title || !description || !icon) {
        throw "Please specify a title, a description and an icon url";
      }

      const allSubscribers = await client.query(
        `SELECT * FROM notifications WHERE basic_notification = true`
      );

      const payload = JSON.stringify({
        ...req.body,
      });

      const allPromises = [];
      const toClean = [];
      allSubscribers.rows.forEach((userSubscription) => {
        const subscription = {
          endpoint: userSubscription.subscription_endpoint,
          keys: JSON.parse(userSubscription.subscription_keys),
          expirationTime: null,
        };
        allPromises.push(
          webpush
            .sendNotification(subscription, payload)
            .then((result) => console.log("notified:", userSubscription.id))
            .catch((e) => {
              if (
                e.body === "push subscription has unsubscribed or expired.\n"
              ) {
                toClean.push(userSubscription);
              } else {
                console.log(e);
              }
            })
        );
      });

      console.log("send notifications");
      await Promise.all(allPromises);
      console.log("cleaning up old notifications");
      const cleanAsString = toClean.reduce(
        (old, subscription) => (old += ` OR id = ${subscription.id}`),
        "FALSE"
      );
      await client.query(`DELETE FROM notifications WHERE ${cleanAsString}`);

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

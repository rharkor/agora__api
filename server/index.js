const express = require("express");
require("dotenv").config();
const cors = require("cors");
const webpush = require("web-push");
const morgan = require("morgan");

const { connect } = require("./utils/database");
const { checkAccessMiddleware } = require("./middlewares/access");
const { checkTokenMiddleware } = require("./middlewares/auth");
const { errorMiddleware } = require("./middlewares/error");

const authRouter = require("./routers/auth");
const notificationsRouter = require("./routers/notifications");
const accessRouter = require("./routers/access");
const adminRouter = require("./routers/admin");
const calendarRouter = require("./routers/modules/calendar");
const megasqlRouter = require("./routers/modules/megasql");

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));
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

app.use("/", authRouter);
app.use("/notifications", notificationsRouter);
app.use("/admin", adminRouter);
app.use("/access", accessRouter);
app.use(
  "/calendar",
  checkTokenMiddleware,
  checkAccessMiddleware,
  calendarRouter
);
app.use("/megasql", checkTokenMiddleware, checkAccessMiddleware, megasqlRouter);

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  connect();
});

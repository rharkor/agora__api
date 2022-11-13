const { client } = require("../utils/database");

const checkAccessMiddleware = async (req, res, next) => {
  if (!req.body.id) {
    return res
      .status(401)
      .json({ message: "Need to be authenticated by user id" });
  }

  let user = await client.query(`SELECT * FROM users WHERE id = $1`, [
    req.body.id,
  ]);
  if (user.rows.length <= 0) {
    return res.status(401).json({ message: "Failed to find the user" });
  }
  user = user.rows[0];

  if (user.admin) {
    return next();
  }

  if (req.originalUrl.match(/\/calendar.*/)) {
    const haveAccess = user["calendar_access"];
    if (!haveAccess) {
      return res
        .status(401)
        .json({ status: "error", error: "You can't access this module" });
    }
  }

  if (req.originalUrl.match(/\/megasql.*/)) {
    const haveAccess = user["megasql_access"];
    if (!haveAccess) {
      return res
        .status(401)
        .json({ status: "error", error: "You can't access this module" });
    }
  }

  return next();
};

module.exports = {
  checkAccessMiddleware,
};

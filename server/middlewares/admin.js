const { client } = require("../utils/database");

const isAdminMiddleware = async (req, res, next) => {
  if (!req.body.id) {
    return res
      .status(401)
      .json({ message: "Need to be authenticated by user id" });
  }

  const isAdmin = await client.query(
    "SELECT * FROM users WHERE admin = true AND id = $1;",
    [req.body.id]
  );

  if (isAdmin.rows.length <= 0) {
    return res.status(401).json({ message: "You need to be admin" });
  }

  return next();
};

module.exports = {
  isAdminMiddleware,
};

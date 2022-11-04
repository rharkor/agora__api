const jwt = require("jsonwebtoken");
const { client } = require("../utils/database");

/* Récupération du header bearer */
const extractBearerToken = (headerValue) => {
  if (typeof headerValue !== "string") {
    return false;
  }

  const matches = headerValue.match(/(bearer)\s+(\S+)/i);
  return matches && matches[2];
};

/* Vérification du token */
const checkTokenMiddleware = (req, res, next) => {
  // Récupération du token
  const token =
    req.headers.authorization && extractBearerToken(req.headers.authorization);

  // Présence d'un token
  if (!token) {
    return res.status(401).json({ message: "Error. Need a token" });
  }

  // Véracité du token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
    if (err) {
      res.status(401).json({ message: "Error. Bad token" });
    } else {
      const result = await client.query(
        "SELECT * FROM users WHERE email = lower($1) AND id = $2;",
        [decodedToken.email, decodedToken.id]
      );
      if (result.rows.length <= 0) {
        res.status(401).json({ message: "Error. Bad token" });
        return;
      }
      req.body.id = decodedToken.id;
      req.body.email = decodedToken.email;
      return next();
    }
  });
};

module.exports = {
  checkTokenMiddleware,
};

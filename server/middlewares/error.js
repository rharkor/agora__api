const errorMiddleware = async (err, req, res, next) => {
  try {
    if (err) throw err;
    next();
  } catch (e) {
    console.error(e);
    return res.status(401).send({
      status: "failed",
      error: e.toString(),
    });
  }
};

module.exports = { errorMiddleware };

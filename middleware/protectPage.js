const jwt = require("jsonwebtoken");

function protectPage(role) {
  return (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect("/");
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      if (role && payload.role !== role) {
        return res.status(403).send("🚫 Forbidden");
      }

      req.user = payload;
      next();
    } catch (e) {
      return res.redirect("/");
    }
  };
}

module.exports = protectPage;
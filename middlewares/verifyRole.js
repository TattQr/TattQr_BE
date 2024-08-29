const verifyRole = (roles) => {
  return (req, res, next) => {
    console.log("req.user is", req.user, roles);

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = verifyRole;

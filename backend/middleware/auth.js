//Jayden
//I made this file as middleware to ensure backend routes which require users to be logged in cannot be accessed if a jwt token is not avaliable
//This adds an extra layer of security, and we don't have to check each time if a user is logged in, since the middleware does that for us

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

module.exports = function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format passed from frontend is : "Bearer <token>", thus I split with space
  //to extract everything after the space as the token

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    next();
  });
};

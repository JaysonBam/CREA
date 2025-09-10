const { User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";

module.exports = {
  async verifyCredentials(request, response) {
    try {
      const email = request.body.email;
      const password = request.body.password;
      //Verification
      if (!email || !password) {
        return response
          .status(400)
          .json({ error: "Email and password are required" });
      }

      //Get user from email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return response
          .status(404)
          .json({ error: "No user exists with this email. Please register" });
      }

      const jwtToken = jwt.sign(
        { user_id: user.id }, //So that we dont have to pass a user to the backend, the token is already associated with a user
        JWT_SECRET,
        { expiresIn: "24h" } // token expiry
      );

      //Ensure correct password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return response.status(400).json({ error: "Password is incorrect" });
      }
      //if password is indeed correct, return success with user details (to save in session storage)
      return response.status(200).json({
        message: "User verified successfully",
        id: user.id,
        role: user.role,
        token: user.token,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        jwt_token: jwtToken,
      });
    } catch (e) {
      return response
        .status(500)
        .json({ message: "Login was not successful. Please try again" });
    }
  },
};

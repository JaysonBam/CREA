const { User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const { registerSchema } = require("../schemas/RegisterSchema");

module.exports = {
  async verifyCredentials(request, response) {
    try {
      const email = request.body.email;
      const password = request.body.password;
      //Verification
      if (!email || !password) {
        return response
          .status(400)
          .json({ success: false, message: "Email and password are required" });
      }

      //Get user from email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return response.status(404).json({
          success: false,
          message: "No user exists with this email. Please register",
        });
      }

      const jwtToken = jwt.sign(
        { user_id: user.id }, //So that we dont have to pass a user to the backend, the token is already associated with a user
        JWT_SECRET,
        { expiresIn: "24h" } // token expiry
      );

      //Ensure correct password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return response
          .status(400)
          .json({ success: false, message: "Password is incorrect" });
      }
      //if password is indeed correct, return success with user details (to save in session storage)
      return response.status(200).json({
        success: true,
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
      return response.status(500).json({
        success: false,
        message: "Login was not successful. Please try again",
      });
    }
  },

  async register(request, response) {
    //Jayden
    try {
      const result = registerSchema.safeParse(request.body);

      console.log(request.body);
      const { firstName, lastName, email, password, role, phone } = result.data;

      if (!firstName || !lastName || !email || !password || !role) {
        return response.status(400).json({ error: "All fields are required" });
      }

      //Does user exist (cant assign same email to multiple accounts as it is unique)
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return response.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      //Create user with details
      const newUser = await User.create({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,

        password: hashedPassword,
        role: role,
      });

      return response.status(201).json({
        success: true,
        message: "User registered successfully",
        user: newUser,
      });
    } catch (e) {
      console.error(e);
      return response
        .status(500)
        .json({
          success: false,
          message: "Registration was not successful. Please try again",
        });
    }
  },
};

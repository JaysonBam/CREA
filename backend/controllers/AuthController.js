const { User, Resident, Ward, Location } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const { registerSchema } = require("../schemas/RegisterSchema");
const { sendEmailAsync } = require("../services/emailService");

module.exports = {
  // Get current user info
  async me(request, response) {
    try {
      const userId = request.user.user_id;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
      });
      if (!user) {
        return response
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      return response.status(200).json({ success: true, user });
    } catch (e) {
      return response
        .status(500)
        .json({ success: false, message: "Failed to fetch user info" });
    }
  },
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

      //The following
      // sendEmailAsync({
      //   to: "jayden.bailie@gmail.com",
      //   subject: `Test email`,
      //   html: `
      //     <h3>Test</h3>
      //     <p><b>Title:</b> Test</p>
      //     <p><b>Description:</b> Test </p>
      //     <p><b>Active:</b> Test</p>
      //     <hr/>
      //     <small>Sent by CREA via Brevo API</small>
      //   `,
      // });
      // console.log("email sent async");

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
      console.log(request.body);
      const { ward_code, address, address_lat, address_lng, address_place_id } =
        request.body;
      const result = registerSchema.safeParse(request.body);
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

      //If the user is a resident, the Resident can be provided based on the ward_code and address.
      //For communityleader and staff, this will not happen at registration, as we will follow an invitation based setup

      if (role === "resident") {
        console.log(ward_code);
        const ward = await Ward.findOne({ where: { code: ward_code } });
        if (!ward) {
          return response.status(400).json({
            success: false,
            message: "Invalid ward code",
          });
        }

        let locationId = null;
        if (address_lat && address_lng) {
          // Optional: try to find by place_id first (if provided), else by lat/lng
          const where = address_place_id
            ? { place_id: address_place_id }
            : { latitude: address_lat, longitude: address_lng };

          let location = await Location.findOne({ where });

          if (!location) {
            location = await Location.create({
              address: address || null,
              place_id: address_place_id || null,
              latitude: address_lat,
              longitude: address_lng,
            });
          }
          locationId = location.id;
        }
        await Resident.create({
          user_id: newUser.id,
          ward_id: ward.id,
          location_id: locationId,
        });
      }
      return response.status(201).json({
        success: true,
        message: "User registered successfully",
        user: newUser,
      });
    } catch (e) {
      console.error("Register error:", e?.message, e?.stack);
      return response.status(500).json({
        success: false,
        message: "Registration was not successful. Please try again",
      });
    }
  },
};

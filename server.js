const express = require("express");
const mongoose = require("mongoose");
const User = require("./createUser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(express.json());
app.use(cors());


// CONNECT MONGODB
mongoose.connect("mongodb://127.0.0.1:27017/batraDB")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));


// ==========================
// EMAIL CONFIG
// ==========================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prithvimain07@gmail.com",
    pass: "fkakjfblwjoumrsd"  // Your new app password (no spaces)
  }
});


// OTP STORAGE
let otpStore = {};


// HOME ROUTE
app.get("/", (req, res) => {
  res.send("Server Running Successfully");
});


// ==========================
// CREATE USER API
// ==========================

app.post("/createUser", async (req, res) => {

  try {

    const { name, email, password } = req.body;

    // CHECK IF USER EXISTS
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    // SAVE USER
    await newUser.save();

    res.json({
      message: "User Created Successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});


// ==========================
// LOGIN API
// ==========================

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    // FIND USER
    const user = await User.findOne({ email });

    // USER NOT FOUND
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // CHECK PASSWORD
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    // WRONG PASSWORD
    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect Password"
      });
    }

    // LOGIN SUCCESS
    res.json({
      message: "Login Successful",
      name: user.name
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});


// ==========================
// SEND OTP API
// ==========================

app.post("/sendOTP", async (req, res) => {

  try {

    const { email } = req.body;

    // CHECK USER
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // GENERATE OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    );

    // SAVE OTP WITH EXPIRATION (10 minutes)
    otpStore[email] = {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    // SEND EMAIL
    await transporter.sendMail({

      from: "prithvimain07@gmail.com",

      to: email,

      subject: "Batra Hedge Password Reset OTP",

      html: `
        <h2>Your OTP is:</h2>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Do not share this OTP with anyone.</p>
      `
    });

    res.json({
      message: "OTP Sent Successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});


// ==========================
// RESET PASSWORD API
// ==========================

app.post("/resetPassword", async (req, res) => {

  try {

    const { email, otp, newPassword } = req.body;

    // CHECK IF OTP EXISTS
    if (!otpStore[email]) {
      return res.status(400).json({
        message: "OTP not found or expired"
      });
    }

    // CHECK IF OTP EXPIRED
    if (Date.now() > otpStore[email].expiresAt) {
      delete otpStore[email];
      return res.status(400).json({
        message: "OTP has expired"
      });
    }

    // CHECK OTP MATCH
    if (otpStore[email].otp !== Number(otp)) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    // HASH NEW PASSWORD
    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    // UPDATE PASSWORD
    await User.updateOne(
      { email },
      {
        password: hashedPassword
      }
    );

    // DELETE OTP
    delete otpStore[email];

    res.json({
      message: "Password Reset Successful"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }

});


// START SERVER
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
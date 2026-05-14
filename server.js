require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");

const User = require("./createUser");

const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://batrahedge.netlify.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));


// ======================================================
// CONNECT MONGODB ATLAS
// ======================================================

mongoose.connect(process.env.MONGO_URL)

.then(() => {

  console.log("MongoDB Connected Successfully");

})

.catch((err) => {

  console.log("MongoDB Connection Error:");
  console.log(err);

});


// ======================================================
// EMAIL CONFIG
// ======================================================

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {

    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS

  }

});


// ======================================================
// VERIFY EMAIL SERVER
// ======================================================

transporter.verify((error, success) => {

  if (error) {

    console.log("Email Error:");
    console.log(error);

  } else {

    console.log("Email Server Ready");

  }

});


// ======================================================
// OTP STORAGE
// ======================================================

let otpStore = {};


// ======================================================
// HOME ROUTE
// ======================================================

app.get("/", (req, res) => {

  res.send("Batra Hedge Backend Running Successfully");

});


// ======================================================
// CREATE USER API
// ======================================================

app.post("/createUser", async (req, res) => {

  try {

    const { name, email, password } = req.body;

    // CHECK EXISTING USER

    const existingUser = await User.findOne({ email });

    if (existingUser) {

      return res.status(400).json({

        message: "User already exists"

      });

    }

    // HASH PASSWORD

    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE NEW USER

    const newUser = new User({

      name,
      email,
      password: hashedPassword

    });

    // SAVE USER

    await newUser.save();

    res.status(201).json({

      message: "User Created Successfully"

    });

  }

  catch (error) {

    console.log("Create User Error:");
    console.log(error);

    res.status(500).json({

      message: "Server Error"

    });

  }

});


// ======================================================
// LOGIN API
// ======================================================

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    // FIND USER

    const user = await User.findOne({ email });

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

    if (!isMatch) {

      return res.status(401).json({

        message: "Incorrect Password"

      });

    }

    // LOGIN SUCCESS

    res.status(200).json({

      message: "Login Successful",
      name: user.name

    });

  }

  catch (error) {

    console.log("Login Error:");
    console.log(error);

    res.status(500).json({

      message: "Server Error"

    });

  }

});


// ======================================================
// SEND OTP API
// ======================================================

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

    // STORE OTP

    otpStore[email] = {

      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000

    };

    // SEND EMAIL

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: email,

      subject: "Batra Hedge Password Reset OTP",

      html: `

        <div style="font-family: Arial; padding: 20px;">

          <h2>Batra Hedge Password Reset</h2>

          <p>Your OTP is:</p>

          <h1 style="letter-spacing: 4px;">
            ${otp}
          </h1>

          <p>
            This OTP will expire in 10 minutes.
          </p>

          <p>
            Do not share this OTP with anyone.
          </p>

        </div>

      `

    });

    res.status(200).json({

      message: "OTP Sent Successfully"

    });

  }

  catch (error) {

    console.log("Send OTP Error:");
    console.log(error);

    res.status(500).json({

      message: "Server Error"

    });

  }

});


// ======================================================
// RESET PASSWORD API
// ======================================================

app.post("/resetPassword", async (req, res) => {

  try {

    const {

      email,
      otp,
      newPassword

    } = req.body;

    // CHECK OTP EXISTS

    if (!otpStore[email]) {

      return res.status(400).json({

        message: "OTP not found or expired"

      });

    }

    // CHECK OTP EXPIRY

    if (

      Date.now() > otpStore[email].expiresAt

    ) {

      delete otpStore[email];

      return res.status(400).json({

        message: "OTP has expired"

      });

    }

    // CHECK OTP MATCH

    if (

      otpStore[email].otp !== Number(otp)

    ) {

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

    res.status(200).json({

      message: "Password Reset Successful"

    });

  }

  catch (error) {

    console.log("Reset Password Error:");
    console.log(error);

    res.status(500).json({

      message: "Server Error"

    });

  }

});


// ======================================================
// NEWSLETTER SUBSCRIBE API
// ======================================================

app.post("/subscribe", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email) {

      return res.status(400).json({

        message: "Email is required"

      });

    }

    // SEND EMAIL TO ADMIN

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: process.env.EMAIL_USER,

      subject: "New Newsletter Subscriber",

      html: `

        <div style="font-family: Arial; padding: 20px;">

          <h2>New Newsletter Subscription</h2>

          <p>
            <strong>Email:</strong> ${email}
          </p>

        </div>

      `

    });

    // CONFIRMATION EMAIL TO USER

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: email,

      subject: "Subscribed Successfully - Batra Hedge",

      html: `

        <div style="font-family: Arial; padding: 20px;">

          <h2>Welcome to Batra Hedge Insights</h2>

          <p>
            Thank you for subscribing to our newsletter.
          </p>

          <p>
            You will now receive the latest market insights and updates.
          </p>

        </div>

      `

    });

    res.status(200).json({

      message: "Subscribed Successfully"

    });

  }

  catch (error) {

    console.log("Subscribe Error:");
    console.log(error);

    res.status(500).json({

      message: "Subscription Failed"

    });

  }

});


// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});

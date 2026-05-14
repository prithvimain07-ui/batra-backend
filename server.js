require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const User = require("./createUser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();


// ==========================
// MIDDLEWARE
// ==========================

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


// ==========================
// CONNECT MONGODB ATLAS
// ==========================

mongoose.connect(process.env.MONGO_URL)

.then(() => {

  console.log("MongoDB Connected Successfully");

})

.catch((err) => {

  console.log("MongoDB Connection Error:");
  console.log(err);

});


// ==========================
// EMAIL CONFIG
// ==========================

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {

    user: process.env.EMAIL_USER,

    pass: process.env.EMAIL_PASS

  }

});


// VERIFY EMAIL CONNECTION

transporter.verify(function(error, success) {

  if (error) {

    console.log("Email Error:");
    console.log(error);

  } else {

    console.log("Email Server Ready");

  }

});


// ==========================
// OTP STORAGE
// ==========================

let otpStore = {};


// ==========================
// HOME ROUTE
// ==========================

app.get("/", (req, res) => {

  res.send("Batra Hedge Backend Running");

});


// ==========================
// CREATE USER API
// ==========================

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

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

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

  }

  catch (error) {

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

    // SUCCESS LOGIN

    res.json({

      message: "Login Successful",

      name: user.name

    });

  }

  catch (error) {

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

    res.json({

      message: "OTP Sent Successfully"

    });

  }

  catch (error) {

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

    const {

      email,
      otp,
      newPassword

    } = req.body;

    // OTP EXISTS?

    if (!otpStore[email]) {

      return res.status(400).json({

        message: "OTP not found or expired"

      });

    }

    // OTP EXPIRED?

    if (

      Date.now() > otpStore[email].expiresAt

    ) {

      delete otpStore[email];

      return res.status(400).json({

        message: "OTP has expired"

      });

    }

    // OTP MATCH?

    if (

      otpStore[email].otp !== Number(otp)

    ) {

      return res.status(400).json({

        message: "Invalid OTP"

      });

    }

    // HASH PASSWORD

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

  }

  catch (error) {

    console.log(error);

    res.status(500).json({

      message: "Server Error"

    });

  }

});


// ==========================
// START SERVER
// ==========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});
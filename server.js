require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");

const User = require("./createUser");

const app = express();

// =========================
// MIDDLEWARE
// =========================
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

// =========================
// HEALTH CHECK (IMPORTANT FOR RENDER)
// =========================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// =========================
// MONGODB CONNECTION
// =========================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// =========================
// EMAIL SETUP
// =========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify()
  .then(() => console.log("Email Ready"))
  .catch(err => console.log("Email Error:", err));

// =========================
// OTP STORE
// =========================
const otpStore = new Map();

// =========================
// CREATE USER
// =========================
app.post("/createUser", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await new User({ name, email, password: hashed }).save();

    res.json({ message: "User Created Successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// =========================
// LOGIN
// =========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Wrong password" });

    res.json({ message: "Login Successful", name: user.name });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// =========================
// SUBSCRIBE (FIXED SAFE VERSION)
// =========================
app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Subscriber",
      html: `<p>New subscriber: ${email}</p>`
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Subscribed Successfully",
      html: `<h2>Thanks for subscribing!</h2>`
    });

    return res.status(200).json({
      success: true,
      message: "Subscribed Successfully"
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Subscription Failed"
    });
  }
});

// =========================
// GLOBAL 404 HANDLER (IMPORTANT FIX)
// =========================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path
  });
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

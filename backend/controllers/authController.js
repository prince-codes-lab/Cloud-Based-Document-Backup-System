const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/email");

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// POST /api/auth/forgot-password  { email }
// Always responds with a generic success message, whether or not the email
// exists, so the endpoint can't be used to check which emails are registered.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const genericResponse = {
      message: "If an account with that email exists, a reset link has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailErr) {
      // Roll back the token so a broken email config doesn't leave a dangling reset link
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      console.error("Failed to send password reset email:", emailErr.message);
      return res.status(500).json({ message: "Could not send reset email. Check EMAIL_* settings in .env." });
    }

    res.json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: "Request failed", error: err.message });
  }
};

// POST /api/auth/reset-password/:token  { password }
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    user.password = password; // pre-save hook hashes it
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
};

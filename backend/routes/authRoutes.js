const express = require("express");
const router = express.Router();
const { signup, login, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me", auth, getMe);

module.exports = router;

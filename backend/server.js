require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

connectDB();

// Allow the configured frontend origin(s) in production, plus local dev servers.
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173", `https://the-cloud-docs.netlify.app/`].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Error handler — gives friendly messages for common upload errors instead of a generic 500
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large for the current plan limit (10MB)." });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Request blocked by CORS policy." });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

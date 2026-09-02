const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const fileController = require("../controllers/fileController");

// Files are buffered in memory then streamed to Cloudinary. Cloudinary's free
// plan caps image/raw files at 10MB and video at 100MB — this limit covers the
// common case; raise it if you're on a paid Cloudinary plan.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

router.post("/upload", upload.single("file"), fileController.uploadFile);
router.post("/:id/version", upload.single("file"), fileController.uploadNewVersion);

router.get("/", fileController.listFiles);
router.get("/trash", fileController.listTrash);
router.get("/:id/download", fileController.downloadFile);
router.get("/:id/versions/:versionIndex/download", fileController.downloadVersion);

router.patch("/:id/restore-version/:versionIndex", fileController.restoreVersion);
router.patch("/:id/restore", fileController.restoreFile);

router.delete("/:id", fileController.softDeleteFile);
router.delete("/:id/permanent", fileController.permanentDeleteFile);

module.exports = router;

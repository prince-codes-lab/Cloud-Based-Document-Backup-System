const File = require("../models/File");
const User = require("../models/User");
const { uploadToCloudinary, getDownloadUrl, deleteFromCloudinary } = require("../utils/cloudinary");

// POST /api/files/upload  (multipart/form-data, field name: "file")
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { originalname, mimetype, size, buffer } = req.file;
    const folder = req.body.folder || "/";
    const folderPath = `file-backup-system/${req.userId}`;

    const result = await uploadToCloudinary(buffer, folderPath);

    const file = await File.create({
      owner: req.userId,
      originalName: originalname,
      mimetype,
      size,
      currentPublicId: result.public_id,
      currentResourceType: result.resource_type,
      currentFormat: result.format || "",
      folder,
      versions: [
        {
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format || "",
          size,
        },
      ],
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: size } });

    res.status(201).json({ file });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// POST /api/files/:id/version  -> upload a new version of an existing file
exports.uploadNewVersion = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isDeleted: false });
    if (!file) return res.status(404).json({ message: "File not found" });

    const { originalname, mimetype, size, buffer } = req.file;
    const folderPath = `file-backup-system/${req.userId}`;
    const result = await uploadToCloudinary(buffer, folderPath);

    file.versions.push({
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format || "",
      size,
    });
    file.currentPublicId = result.public_id;
    file.currentResourceType = result.resource_type;
    file.currentFormat = result.format || "";
    file.size = size;
    file.mimetype = mimetype;
    await file.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: size } });

    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: "Version upload failed", error: err.message });
  }
};

// GET /api/files  -> dashboard listing (non-deleted)
exports.listFiles = async (req, res) => {
  try {
    const { folder, search } = req.query;
    const query = { owner: req.userId, isDeleted: false };
    if (folder) query.folder = folder;
    if (search) query.originalName = { $regex: search, $options: "i" };

    const files = await File.find(query).sort({ createdAt: -1 });
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: "Failed to list files", error: err.message });
  }
};

// GET /api/files/trash  -> soft-deleted files
exports.listTrash = async (req, res) => {
  try {
    const files = await File.find({ owner: req.userId, isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: "Failed to list trash", error: err.message });
  }
};

// GET /api/files/:id/download -> returns a signed, expiring download URL for the current version
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isDeleted: false });
    if (!file) return res.status(404).json({ message: "File not found" });

    const url = getDownloadUrl(file.currentPublicId, file.currentResourceType, file.currentFormat);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate download link", error: err.message });
  }
};

// GET /api/files/:id/versions/:versionIndex/download
exports.downloadVersion = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId });
    if (!file) return res.status(404).json({ message: "File not found" });

    const version = file.versions[req.params.versionIndex];
    if (!version) return res.status(404).json({ message: "Version not found" });

    const url = getDownloadUrl(version.publicId, version.resourceType, version.format);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate download link", error: err.message });
  }
};

// PATCH /api/files/:id/restore-version/:versionIndex -> make an older version current
exports.restoreVersion = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isDeleted: false });
    if (!file) return res.status(404).json({ message: "File not found" });

    const version = file.versions[req.params.versionIndex];
    if (!version) return res.status(404).json({ message: "Version not found" });

    file.currentPublicId = version.publicId;
    file.currentResourceType = version.resourceType;
    file.currentFormat = version.format;
    file.size = version.size;
    await file.save();

    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: "Restore failed", error: err.message });
  }
};

// DELETE /api/files/:id -> soft delete (move to trash)
exports.softDeleteFile = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!file) return res.status(404).json({ message: "File not found" });
    res.json({ message: "File moved to trash", file });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};

// PATCH /api/files/:id/restore -> restore from trash
exports.restoreFile = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!file) return res.status(404).json({ message: "File not found in trash" });
    res.json({ message: "File restored", file });
  } catch (err) {
    res.status(500).json({ message: "Restore failed", error: err.message });
  }
};

// DELETE /api/files/:id/permanent -> permanently delete file + all versions from Cloudinary
exports.permanentDeleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.userId, isDeleted: true });
    if (!file) return res.status(404).json({ message: "File not found in trash" });

    await Promise.all(
      file.versions.map((v) => deleteFromCloudinary(v.publicId, v.resourceType))
    );

    const totalSize = file.versions.reduce((sum, v) => sum + v.size, 0);
    await User.findByIdAndUpdate(req.userId, { $inc: { storageUsed: -totalSize } });

    await file.deleteOne();
    res.json({ message: "File permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: "Permanent delete failed", error: err.message });
  }
};

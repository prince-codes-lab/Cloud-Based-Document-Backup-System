const mongoose = require("mongoose");

// Each version keeps its own Cloudinary identifiers so a file can be
// restored to a prior version.
const versionSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    resourceType: { type: String, required: true }, // "image" | "video" | "raw"
    format: { type: String, default: "" },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }, // size of current/latest version
    currentPublicId: { type: String, required: true },
    currentResourceType: { type: String, required: true },
    currentFormat: { type: String, default: "" },
    versions: { type: [versionSchema], default: [] },
    folder: { type: String, default: "/" }, // simple folder path support
    isDeleted: { type: Boolean, default: false }, // soft delete -> trash
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

fileSchema.index({ owner: 1, isDeleted: 1 });

module.exports = mongoose.model("File", fileSchema);

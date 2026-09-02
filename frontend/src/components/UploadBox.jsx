import React, { useRef, useState } from "react";
import client from "../api/client";

export default function UploadBox({ onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await client.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`upload-box ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        uploadFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current.click()}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={(e) => uploadFile(e.target.files[0])}
      />
      {uploading ? "Uploading..." : "Drag & drop a file here, or click to browse"}
    </div>
  );
}

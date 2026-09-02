import React from "react";
import client from "../api/client";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({ files, trashView, onChange }) {
  const handleDownload = async (file) => {
    const res = await client.get(`/files/${file._id}/download`);
    window.open(res.data.url, "_blank");
  };

  const handleDelete = async (file) => {
    await client.delete(`/files/${file._id}`);
    onChange();
  };

  const handleRestore = async (file) => {
    await client.patch(`/files/${file._id}/restore`);
    onChange();
  };

  const handlePermanentDelete = async (file) => {
    if (!confirm(`Permanently delete "${file.originalName}"? This cannot be undone.`)) return;
    await client.delete(`/files/${file._id}/permanent`);
    onChange();
  };

  if (files.length === 0) {
    return <p className="empty-state">{trashView ? "Trash is empty." : "No files yet — upload one to get started."}</p>;
  }

  return (
    <table className="file-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Versions</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file._id}>
            <td>{file.originalName}</td>
            <td>{formatSize(file.size)}</td>
            <td>{file.versions?.length || 1}</td>
            <td>{new Date(file.updatedAt).toLocaleString()}</td>
            <td className="actions">
              {trashView ? (
                <>
                  <button onClick={() => handleRestore(file)}>Restore</button>
                  <button className="danger" onClick={() => handlePermanentDelete(file)}>
                    Delete forever
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDownload(file)}>Download</button>
                  <button className="danger" onClick={() => handleDelete(file)}>
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

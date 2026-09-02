import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import UploadBox from "../components/UploadBox";
import FileList from "../components/FileList";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [view, setView] = useState("files"); // "files" | "trash"
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = view === "trash" ? "/files/trash" : "/files";
      const res = await client.get(endpoint, { params: view === "files" ? { search } : {} });
      setFiles(res.data.files);
    } finally {
      setLoading(false);
    }
  }, [view, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>CloudVault</h1>
        <div className="user-info">
          <span>{user?.name}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <nav className="dashboard-tabs">
        <button className={view === "files" ? "active" : ""} onClick={() => setView("files")}>
          My Files
        </button>
        <button className={view === "trash" ? "active" : ""} onClick={() => setView("trash")}>
          Trash
        </button>
      </nav>

      {view === "files" && (
        <>
          <UploadBox onUploaded={fetchFiles} />
          <input
            className="search-input"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </>
      )}

      {loading ? <p>Loading...</p> : <FileList files={files} trashView={view === "trash"} onChange={fetchFiles} />}
    </div>
  );
}

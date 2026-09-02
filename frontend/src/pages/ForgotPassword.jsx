import React, { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await client.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 6px" }}>
          Enter your account email and we'll send you a reset link.
        </p>
        {error && <p className="error">{error}</p>}
        {message && <p style={{ color: "var(--brass)", fontSize: "0.9rem" }}>{message}</p>}
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </button>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}

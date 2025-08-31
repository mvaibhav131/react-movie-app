import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import "./style.scss"; // Import styles

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Email: ${email}, Password: ${password}`);
    setEmail("");
    setPassword("");

    if (email.length >= 1 && password.length >= 1) {
      navigate("/");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header */}
        <h1 className="login-title">Welcome Back 👋</h1>
        <p className="login-subtitle">Login to continue exploring</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Email */}
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Button */}
          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <hr />
          <span>OR</span>
          <hr />
        </div>

        {/* Footer */}
        <p className="toggle-text">
          Don’t have an account?{" "}
          <Link to="/register" className="toggle-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

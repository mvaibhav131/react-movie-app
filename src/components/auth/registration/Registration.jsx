import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import "./style.scss";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Name: ${name}, Email: ${email}, Password: ${password}`);
    setName("");
    setEmail("");
    setPassword("");

    if (name && email && password) {
      navigate("/login");
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">Create Account ✨</h1>
        <p className="register-subtitle">Sign up to get started</p>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Name */}
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Email"
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="register-btn">
            Register
          </button>
        </form>

        <div className="divider">
          <hr />
          <span>OR</span>
          <hr />
        </div>

        <p className="toggle-text">
          Already have an account?{" "}
          <Link to="/login" className="toggle-link">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

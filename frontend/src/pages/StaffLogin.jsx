// StaffLogin.jsx
import { useState } from "react";
import { loginStaff } from "../api";
import { useNavigate } from "react-router-dom";
import { setToken } from "../utils/auth";
import '../styles/AdminLogin.css';

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const res = await loginStaff({ email, password });
      
      if (res.data && res.data.token) {
        setToken(res.data.token);
        localStorage.setItem("so_staff", JSON.stringify(res.data.staff || {}));
        navigate("/staff/dashboard");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleRegisterClick = () => {
    navigate("/staff/register");
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        
        <div className="admin-login-header">
          <h2>Staff Portal</h2>
          <p>Welcome! Please enter your credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {/* Email Input */}
          <div className="form-group">
            <label>Email Address</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email" 
              placeholder="staff@example.com"
              required 
            />
          </div>

          {/* Password Input with Toggle */}
          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                required 
              />
              <button 
                type="button" 
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {error && <div className="error-message">{error}</div>}

          {/* Action Buttons */}
          <div className="button-group">
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
            <button className="btn-secondary" type="button" onClick={handleRegisterClick}>
              Register New Staff
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

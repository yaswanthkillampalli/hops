// AdminLogin.jsx
import { useState } from "react";
import { loginBusiness } from "../api";
import { useNavigate } from "react-router-dom";
import { setToken } from "../utils/auth";
import '../styles/AdminLogin.css'; // Make sure this path points to your new CSS file

export default function AdminLogin() {
  // State for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // New State: Handle errors, loading status, and password visibility
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  // Function to handle the login process
  async function handleSubmit(e) {
    e.preventDefault(); // Prevents the page from reloading
    setError("");
    setIsLoading(true); // Disable the button while we wait for the server
    
    try {
      const res = await loginBusiness({ email, password });
      
      if (res.data && res.data.token) {
        setToken(res.data.token);
        localStorage.setItem("so_business", JSON.stringify(res.data.business || {}));
        navigate("/admin/dashboard"); // Redirect on success
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false); // Re-enable the button once the request finishes
    }
  }

  // Function to handle navigation to the registration page
  const handleRegisterClick = () => {
    navigate("/admin/register");
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        
        <div className="admin-login-header">
          <h2>Admin Portal</h2>
          <p>Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {/* Email Input */}
          <div className="form-group">
            <label>Email Address</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email" 
              placeholder="admin@example.com"
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
              Register New Admin
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
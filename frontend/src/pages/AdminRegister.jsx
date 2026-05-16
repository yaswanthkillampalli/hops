import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerBusinessAdmin } from "../api";
import "../styles/AdminLogin.css";
import "../styles/AdminRegister.css";

const initialForm = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
  businessType: "hotel",
  address: "",
};

export default function AdminRegister() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await registerBusinessAdmin(form);
      setSuccess("Admin created successfully. Redirecting to login...");
      setForm(initialForm);
      window.setTimeout(() => navigate("/admin/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create admin account.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="admin-register-wrapper">
      <div className="admin-register-card">
        <div className="admin-login-header">
          <h2>Create Admin</h2>
          <p>Register the business account used for admin access.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-register-form">
          <div className="register-grid">
            <div className="form-group">
              <label>Business Name</label>
              <input value={form.businessName} onChange={updateField("businessName")} type="text" placeholder="Hospitality Group" required />
            </div>

            <div className="form-group">
              <label>Owner Name</label>
              <input value={form.ownerName} onChange={updateField("ownerName")} type="text" placeholder="John Doe" required />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input value={form.email} onChange={updateField("email")} type="email" placeholder="admin@example.com" required />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input value={form.phone} onChange={updateField("phone")} type="tel" placeholder="+1 555 123 4567" required />
            </div>

            <div className="form-group">
              <label>Business Type</label>
              <select value={form.businessType} onChange={updateField("businessType")}>
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="hostel">Hostel</option>
                <option value="serviced_apartment">Serviced Apartment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group form-group--full">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input value={form.password} onChange={updateField("password")} type={showPassword ? "text" : "password"} placeholder="Create a secure password" required />
                <button type="button" className="toggle-password-btn" onClick={() => setShowPassword((prev) => !prev)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-group form-group--full">
              <label>Business Address</label>
              <textarea value={form.address} onChange={updateField("address")} placeholder="Street, city, state, country" rows="3" />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="button-group">
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Admin"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => navigate("/admin/login")}>
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
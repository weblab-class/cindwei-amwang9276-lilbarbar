import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: 16,
        background: "var(--panel)",
      }}
    >
      <strong>SIDEQUEST</strong>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/home">Home</Link>
        <Link to="/profile">Profile</Link>
        <button
          className="secondary"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

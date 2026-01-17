import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "200px",
        height: "100vh",
        padding: "1.5rem",
        background: "#000000",
        borderRight: "2px solid rgba(255, 255, 255, 0.2)",
        position: "fixed",
        left: 0,
        top: 0,
        gap: "2rem",
      }}
    >
      <strong style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>SIDEQUEST</strong>
      <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Link 
          to="/home"
          style={{ 
            textDecoration: "none", 
            color: "var(--text)",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          Home
        </Link>
        <Link 
          to="/profile"
          style={{ 
            textDecoration: "none", 
            color: "var(--text)",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          Profile
        </Link>
      </nav>
      <button
        className="secondary"
        onClick={() => {
          logout();
          navigate("/");
        }}
        style={{
          marginTop: "auto",
          alignSelf: "flex-start",
        }}
      >
        Logout
      </button>
    </div>
  );
}

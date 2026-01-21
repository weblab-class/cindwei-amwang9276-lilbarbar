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
      {/* Logo + Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          marginBottom: "1rem",
          marginLeft: "-1rem",
        }}
      >
        <img
          src="/scroll.svg"
          alt="QuestChest logo"
          width={60}
          height={60}
          style={{ imageRendering: "pixelated", marginTop: "-1rem" }}
        />
        <strong style={{ fontSize: "1.25rem" }}>QuestChest</strong>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Link
          to="/home"
          className="float-bob"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "var(--text)",
            padding: "0.5rem",
            borderRadius: "4px",
            animationDelay: "1s",
          }}
        >
          <img src="/images/map.svg" alt="" width={40} height={40} />
          Home
        </Link>

        <Link
          to="/profile"
          className="float-bob"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "var(--text)",
            padding: "0.5rem",
            borderRadius: "4px",
            animationDelay: "1.5s",
          }}
        >
          <img src="/images/chest.svg" alt="" width={40} height={40} />
          Profile
        </Link>
      </nav>

      {/* Logout */}
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

import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1>SIDEQUEST</h1>
        <p>Turn life into a game.</p>
        <button onClick={() => navigate("/login")}>
          Log in / Sign up
        </button>
      </div>
    </div>
  );
}


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <h2>Login</h2>
        <input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />
        <button
          onClick={() => {
            login(username);
            navigate("/home");
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

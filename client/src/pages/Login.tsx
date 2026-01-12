import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");


  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <h2>Login / Signup</h2>

        <input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        <button
          onClick={async () => {
            try {
              await login(username, password);
              navigate("/home");
            } catch (e) {
              alert("Login failed");
            }
          }}
        >
          Login
        </button>

        <button
          className="secondary"
          onClick={async () => {
            try {
              await signup(username, password);
              navigate("/home");
            } catch (e) {
              alert("Signup failed");
            }
          }}
        >
          Signup
        </button>
      </div>
    </div>
  );
}

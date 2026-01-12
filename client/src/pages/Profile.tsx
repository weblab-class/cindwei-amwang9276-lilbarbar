import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <h2>@{user.username}</h2>
      <p>Profile page</p>
    </div>
  );
}

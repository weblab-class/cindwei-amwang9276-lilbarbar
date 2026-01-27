import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Trending from "./pages/Trending";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <div style={{ display: "flex" }}>
                <Navbar />
                <div style={{ marginLeft: "200px", width: "calc(100% - 200px)" }}>
                  <Home />
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trending"
          element={
            <ProtectedRoute>
              <div style={{ display: "flex" }}>
                <Navbar />
                <div style={{ marginLeft: "200px", width: "calc(100% - 200px)" }}>
                  <Trending />
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div style={{ display: "flex" }}>
                <Navbar />
                <div style={{ marginLeft: "200px", width: "calc(100% - 200px)" }}>
                  <Profile />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

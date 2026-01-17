import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Home from "./Home";
import Navbar from "../components/Navbar";
import "./Login.css";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);
  const [showHomeTransition, setShowHomeTransition] = useState(false);
  const [imageHeight, setImageHeight] = useState("400vh");
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load image to get its natural dimensions
    const img = new Image();
    img.src = "/images/ocean-cross-section.png";
    img.onload = () => {
      // Calculate height based on image aspect ratio and viewport width
      const aspectRatio = img.height / img.width;
      const viewportWidth = window.innerWidth;
      const calculatedHeight = viewportWidth * aspectRatio;
      // Convert to viewport height units
      const heightInVh = (calculatedHeight / window.innerHeight) * 100;
      setImageHeight(`${heightInVh}vh`);
    };
  }, []);

  const handleScrollTransition = async () => {
    if (!containerRef.current || !imageRef.current) return;
    
    // Fade out overlay
    setIsScrolling(true);
    
    // Wait a bit for fade out
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const container = containerRef.current;
    // Use scrollHeight to get the total scrollable height
    const scrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const scrollDistance = scrollHeight - containerHeight;
    
    // Smooth scroll animation
    container.scrollTo({
      top: scrollDistance,
      behavior: "smooth",
    });
    
    // Wait for scroll animation to complete
    // Estimate scroll duration based on distance (roughly 1s per 100vh)
    const scrollDuration = Math.min(Math.max(3000, (scrollDistance / window.innerHeight) * 1000), 8000);
    
    await new Promise((resolve) => setTimeout(resolve, scrollDuration + 500));
    
    // Show home transition - slide up from bottom
    setShowHomeTransition(true);
    
    // Wait for slide animation to complete (1s animation)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Navigate to home after transition completes
    navigate("/home");
  };

  const handleLogin = async () => {
    try {
      await login(username, password);
      await handleScrollTransition();
    } catch (e) {
      alert("Login failed");
    }
  };

  const handleSignup = async () => {
    try {
      await signup(username, password);
      await handleScrollTransition();
    } catch (e) {
      alert("Signup failed");
    }
  };

  return (
    <div 
      ref={containerRef}
      className="login-container"
      style={{ 
        height: "100vh", 
        width: "100vw",
        overflow: "auto",
        position: "relative",
        scrollBehavior: "smooth"
      }}
    >
      <div 
        ref={imageRef}
        className="ocean-background"
        style={{
          height: imageHeight,
          width: "100%",
          backgroundImage: "url('/images/ocean-cross-section.png')",
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
          position: "relative",
        }}
      />
      
      <div 
        className="login-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "grid",
          placeItems: "center",
          zIndex: 10,
          pointerEvents: isScrolling ? "none" : "auto",
          opacity: isScrolling ? 0 : 1,
          transition: "opacity 0.5s ease-out",
          visibility: isScrolling ? "hidden" : "visible",
        }}
      >
        <div className="login-form">
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

          <button onClick={handleLogin}>
            Login
          </button>

          <button
            className="secondary"
            onClick={handleSignup}
          >
            Signup
          </button>
        </div>
      </div>
      
      {showHomeTransition && (
        <div
          className="home-transition"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            backgroundColor: "var(--background, #242424)",
          }}
        >
          <Navbar />
          <Home />
        </div>
      )}
    </div>
  );
}

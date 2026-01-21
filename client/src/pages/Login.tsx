import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Home from "./Home";
import Navbar from "../components/Navbar";
import "./Login.css";

const [signupMessage, setSignupMessage] = useState("");


//ease in and out functions

const easeInOutCubic = (t: number) =>
  t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeInCubic = (t: number) => t * t * t;

//animate the scrolling

const animateScroll = (
  element: HTMLElement,
  from: number,
  to: number,
  duration: number,
  easing: (t: number) => number
) =>
  new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      element.scrollTop = from + (to - from) * easing(t);
      t < 1 ? requestAnimationFrame(step) : resolve();
    };
    requestAnimationFrame(step);
  });

//noise function

const noise = (t: number) =>
  Math.sin(t * 0.7) * 0.6 +
  Math.sin(t * 1.3) * 0.3 +
  Math.sin(t * 2.1) * 0.1;

//components

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);
  const [showHomeTransition, setShowHomeTransition] = useState(false);
  const [imageHeight, setImageHeight] = useState("400vh");

  const containerRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  //set image heights

  useEffect(() => {
    const img = new Image();
    img.src = "/images/ocean-cross-section.png";
    img.onload = () => {
      const vh =
        (window.innerWidth * (img.height / img.width)) /
        window.innerHeight *
        100;
      setImageHeight(`${vh}vh`);
    };
  }, []);

  //animate the ship

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const animate = (time: number) => {
      const t = (time - start) / 1000;
      const y = noise(t) * 10;
      const r = noise(t + 10) * 2;

      if (shipRef.current) {
        shipRef.current.style.transform = `
          translate(-50%, ${y}px)
          rotate(${r}deg)
        `;
      }
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  //attempt to add canvas ripples (not currently working) TODO

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const ripples: any[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastSpawn = 0;

    const spawnRipple = (x: number, y: number) => {
      ripples.push({
        x,
        y,
        r: 0,
        a: 0.35,
        s: 0.35 + Math.random() * 0.15,
      });
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ambient ship ripple
      if (time - lastSpawn > 2500 + Math.random() * 2000) {
        spawnRipple(window.innerWidth / 2, window.innerHeight * 0.18);
        lastSpawn = time;
      }

      ripples.forEach((p) => {
        p.r += p.s;
        p.a -= 0.002;
      });

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (ripples[i].a <= 0) ripples.splice(i, 1);
      }

      ctx.lineWidth = 0.6;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(255,255,255,0.4)";

      ripples.forEach((p) => {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r - i * 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,255,255,${p.a * (1 - i * 0.3)})`;
          ctx.stroke();
        }
      });

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // cursor ripples
    const onMove = (e: MouseEvent) =>
      spawnRipple(e.clientX, e.clientY);

    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  //scroll transition to home

  const handleScrollTransition = async () => {
    if (!containerRef.current) return;

    setIsScrolling(true);
    await new Promise((r) => setTimeout(r, 400));

    const el = containerRef.current;
    const max = el.scrollHeight - el.clientHeight;

    await animateScroll(el, 0, max * 0.9, 6000, easeInOutCubic);
    await animateScroll(el, max * 0.9, max, 900, easeInCubic);

    setShowHomeTransition(true);
    await new Promise((r) => setTimeout(r, 500));
    navigate("/home");
  };

  //login authentication 

  const handleLogin = async () => {
    await login(username, password);
    await handleScrollTransition();
  };

  const handleSignup = async () => {
    setSignupMessage("signup successful");
    await signup(username, password);
    await handleScrollTransition();
  };

  //rendering

  return (
    <div
      ref={containerRef}
      className="login-container"
      style={{ height: "100vh", overflow: "auto", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <div
        className="ocean-background"
        style={{
          height: imageHeight,
          backgroundImage: "url('/images/ocean-cross-section.png')",
          backgroundSize: "100% auto",
          backgroundRepeat: "no-repeat",
          position: "relative",
        }}
      >
        {/* ship */}
        <div
          ref={shipRef}
          style={{
            position: "absolute",
            left: "41%",
            top: "calc(15vh + 400px)",
            zIndex: 3,
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          <img src="/images/ship.png" width={180} />
        </div>
      </div>

      {/* login ui */}
      <div
        className="login-overlay"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          padding: "1.5rem",
          zIndex: 10,
          opacity: isScrolling ? 0 : 1,
          transition: "opacity 0.5s",
        }}
      >
        <div className="login-form">
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="login-buttons">
            <button onClick={handleLogin}>Login</button>
            <button className="secondary" onClick={handleSignup}>Signup</button>

            {signupMessage && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.9rem",
                  color: "#a7ffd3", // mint green glow vibe
                  textAlign: "center",
                }}
              >
                {signupMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {showHomeTransition && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 20,
            display: "flex",
          }}
        >
          <Navbar />
          <Home />
        </div>
      )}
    </div>
  );
}

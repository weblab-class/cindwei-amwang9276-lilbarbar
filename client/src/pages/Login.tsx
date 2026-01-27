import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeInCubic = (t: number) => t * t * t;

const animateScroll = (
  element: HTMLElement,
  from: number,
  to: number,
  duration: number,
  easing: (t: number) => number,
  onStart?: () => void
) =>
  new Promise<void>((resolve) => {
    const start = performance.now();
    let started = false;
    const step = (now: number) => {
      if (!started) {
        started = true;
        onStart?.();
      }
      const t = Math.min((now - start) / duration, 1);
      element.scrollTop = from + (to - from) * easing(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });

const noise = (t: number) =>
  Math.sin(t * 0.7) * 0.6 +
  Math.sin(t * 1.3) * 0.3 +
  Math.sin(t * 2.1) * 0.1;

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showHomeTransition, setShowHomeTransition] = useState(false);
  const [imageHeight, setImageHeight] = useState("400vh");
  const [isScrollLocked, setIsScrollLocked] = useState(true);
  const [isFadingToHome, setIsFadingToHome] = useState(false);
  const [oceanShiftPx, setOceanShiftPx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isScrollLocked) return;

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const preventScroll = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const keysToBlock = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ];
      if (keysToBlock.includes(e.key)) e.preventDefault();
    };

    if (containerRef.current) containerRef.current.scrollTop = 0;

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener("wheel", preventScroll as EventListener);
      window.removeEventListener("touchmove", preventScroll as EventListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isScrollLocked]);

  useEffect(() => {
    const img = new Image();
    img.src = "/images/ocean-cross-section.png";
    img.onload = () => {
      const aspect = img.height / img.width;

      const clamp = (n: number, min: number, max: number) =>
        Math.max(min, Math.min(max, n));

      const computeOceanShiftPx = () => {
        const shiftFactor = 0.2;
        const baselineH = 800;
        return clamp(Math.round((window.innerHeight - baselineH) * shiftFactor), -220, 220);
      };

      const recalc = () => {
        const vh = ((window.innerWidth * aspect) / window.innerHeight) * 100;
        setImageHeight(`${vh}vh`);
        setOceanShiftPx(computeOceanShiftPx());
      };

      recalc();
      window.addEventListener("resize", recalc);
      return () => window.removeEventListener("resize", recalc);
    };
  }, []);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const animate = (time: number) => {
      const t = (time - start) / 750;
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
    type Ripple = { x: number; y: number; r: number; a: number; s: number };
    const ripples: Ripple[] = [];

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

    setIsScrollLocked(false);
    setIsScrolling(true);
    await new Promise((r) => setTimeout(r, 400));

    const el = containerRef.current;
    const max = el.scrollHeight - el.clientHeight;

    await animateScroll(el, 0, max * 0.78, 6000, easeInOutCubic);
    const phase2DurationMs = 2000;
    const fadeDelayMs = 1000;

    await animateScroll(el, max * 0.78, max, phase2DurationMs, easeInCubic, () => {
      window.setTimeout(() => {
        setIsFadingToHome(true);
        setShowHomeTransition(true);
      }, fadeDelayMs);
    });

    navigate("/home");
  };

  //login authentication 
  const handleLogin = async () => {
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setErrorMessage("Please enter a username/password");
      return;
    }
    setErrorMessage(null);
    try {
      await login(username, password);
      await handleScrollTransition();
    } catch {
      setErrorMessage("The username/password is incorrect");
    }
  };

  const handleSignup = async () => {
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setErrorMessage("Please enter a username/password");
      return;
    }
    setErrorMessage(null);
    try {
      await signup(username, password);
      await handleScrollTransition();
    } catch (e) {
      if (e instanceof Error && e.message === "USERNAME_TAKEN") {
        setErrorMessage("That username already exists");
      } else {
        setErrorMessage("Signup failed");
      }
    }
  };

  //rendering
  return (
    <div
      ref={containerRef}
      className={`login-container${isScrollLocked ? " locked" : ""}`}
    >
      <div className={`login-scene${isFadingToHome ? " fading-out" : ""}`}>
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
            backgroundPosition: `center ${oceanShiftPx}px`,
            position: "relative",
          }}
        >
          {/* ship */}
          <div
            ref={shipRef}
            style={{
              position: "absolute",
              left: "41%",
              top: "calc(15vh + 320px)",
              zIndex: 3,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <img src="/images/ship.png" width={180} />
          </div>
        </div>

        <div className="ocean-spacer" />

        {/* login ui + logo */}
        <div
          className="login-overlay"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            padding: "1.75rem",
            zIndex: 10,
            opacity: isScrolling ? 0 : 1,
            transition: "opacity 0.5s",
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Logo slightly left and below the form */}
            <img
              src="/logo.svg"
              alt="Sidequest logo"
              style={{
                position: "absolute",
                top: 20,
                left: -520,
                width: 600,
                height: "auto",
                opacity: 0.9,
                pointerEvents: "none",
                // filter: "drop-shadow(0 0 12px rgba(0,0,0,0.6))",
              }}
            />

            <div className="login-form">
              <input
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              <input
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              {errorMessage && (
                <div
                  style={{
                    color: "rgba(255, 120, 120, 0.95)",
                    fontSize: "0.8rem",
                    marginTop: "0.25rem",
                    maxWidth: 280,
                  }}
                >
                  {errorMessage}
                </div>
              )}
              <div className="login-buttons">
                <button onClick={handleLogin}>Login</button>
                <button className="secondary" onClick={handleSignup}>Signup</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHomeTransition && (
        <div className="home-fade-overlay" />
      )}
    </div>
  );
}

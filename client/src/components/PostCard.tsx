import { useState, useRef } from "react";
import type { Post } from "../types/post";

interface Props {
  post: Post;
  onVote: (postId: string, delta: number) => void;
  onOpen?: () => void;
}

export default function PostCard({ post, onVote, onOpen }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        display: "inline-block",
        width: "100%",
        marginBottom: 16,
        breakInside: "avoid",
      }}
      className="float-bob"
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onOpen}
        style={{
          background: "var(--panel)",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          width: "100%",
          transform: isHovered ? "translateY(-8px) scale(1.04)" : "translateY(0) scale(1)",
          boxShadow: isHovered
            ? "0 18px 40px rgba(0,0,0,0.55)"
            : "0 4px 10px rgba(0,0,0,0.25)",
          transition: "transform 180ms ease-out, box-shadow 180ms ease-out",
        }}
      >
        <div
          style={{
            width: "100%",
            background: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Vote buttons overlay (top-right) */}
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              zIndex: 2,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVote(post.id, 1);
              }}
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid var(--mint)",
                color: "var(--mint)",
                padding: "2px 8px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              ↑
            </button>
            <span
              style={{
                textAlign: "center",
                color: "var(--text)",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {post.votes}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVote(post.id, -1);
              }}
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid var(--mint)",
                color: "var(--mint)",
                padding: "2px 8px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              ↓
            </button>
          </div>

          {/* Media */}
          {post.media_type === "video" ? (
            <video
              ref={videoRef}
              src={post.media_url}
              style={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "contain",
              }}
              muted
              loop
              autoPlay
              playsInline
              onMouseEnter={() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.volume = 1;
                  void videoRef.current.play().catch(() => {});
                }
              }}
              onMouseLeave={() => {
                if (videoRef.current) {
                  videoRef.current.muted = true;
                }
              }}
            />
          ) : (
            <img
              src={post.media_url}
              alt={post.quest_title || "Post"}
              onLoad={() => setImageLoaded(true)}
              style={{
                width: "100%",
                height: "auto",
                display: imageLoaded ? "block" : "none",
                objectFit: "contain",
              }}
            />
          )}
        </div>
      </div>

      {/* Quest Info */}
      {post.quest_title && (
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{post.quest_icon}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--text)" }}>
            {post.quest_title}
          </span>
        </div>
      )}
    </div>
  );
}

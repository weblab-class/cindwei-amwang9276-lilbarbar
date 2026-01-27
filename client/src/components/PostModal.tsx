import { useState, useEffect, useRef } from "react";
import type { Sidequest } from "../types/sidequest";
import { fetchQuests } from "../services/api";

interface Props {
  onClose: () => void;
  onSubmit: (file: File, questId: string) => Promise<void>;
}

export default function PostModal({ onClose, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quests, setQuests] = useState<Sidequest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQuests(token ?? undefined).then(setQuests);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const filteredQuests = quests.filter((quest) =>
    quest.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!file || !selectedQuestId) {
      setError("Pick a file and a quest before uploading.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      await onSubmit(file, selectedQuestId);
      onClose();
    } catch (error) {
      console.error("Failed to upload post:", error);
      const message =
        error instanceof Error ? error.message : "Something went wrong while uploading.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const selectedQuest = quests.find((q) => q.id === selectedQuestId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowDropdown(false);
        }
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          padding: 24,
          borderRadius: 12,
          width: 400,
          maxWidth: "90vw",
        }}
      >
        <h3>Create Post</h3>

        {/* File Upload */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: "0.9rem",
              color: "var(--text)",
            }}
          >
            Upload Photo or Video
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid var(--muted)",
              background: "transparent",
              color: "var(--text)",
            }}
          />
          {preview && (
            <div style={{ marginTop: 12 }}>
              {file?.type.startsWith("video/") ? (
                <video
                  src={preview}
                  controls
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    borderRadius: 8,
                  }}
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    borderRadius: 8,
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Quest Search */}
        <div style={{ marginBottom: 16, position: "relative" }} ref={dropdownRef}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: "0.9rem",
              color: "var(--text)",
            }}
          >
            Select Quest
          </label>
          <input
            type="text"
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid var(--muted)",
              background: "transparent",
              color: "var(--text)",
              marginBottom: 8,
            }}
          />
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--panel)",
                border: "1px solid var(--muted)",
                borderRadius: 6,
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 10,
              }}
            >
              {filteredQuests.length === 0 ? (
                <div style={{ padding: 12, color: "var(--muted)" }}>
                  No quests found
                </div>
              ) : (
                filteredQuests.map((quest) => (
                  <div
                    key={quest.id}
                    onClick={() => {
                      setSelectedQuestId(quest.id);
                      setSearchQuery(quest.title);
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: 12,
                      cursor: "pointer",
                      borderBottom: "1px solid var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{quest.icon}</span>
                    <span>{quest.title}</span>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedQuest && (
            <div
              style={{
                padding: 8,
                background: "var(--muted)",
                borderRadius: 6,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{selectedQuest.icon}</span>
              <span>{selectedQuest.title}</span>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              color: "#ff8a8a",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || !selectedQuestId || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { Sidequest } from "../types/sidequest";
import SidequestCard from "../components/SidequestCard";
import SubmitQuestModal from "../components/SubmitQuestModal";
import ShareQuestModal from "../components/ShareQuestModal";
import { fetchQuests, createQuest, voteQuest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import LiquidEther from "../components/LiquidEther";

type Vote = -1 | 0 | 1;



export default function Trending() {
  const { token } = useAuth();
  const [quests, setQuests] = useState<Sidequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [shareQuestId, setShareQuestId] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    fetchQuests(timePeriod).then(setQuests);
  }, [timePeriod]);
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});

  useEffect(() => {
    fetchQuests(token ?? undefined).then((qs) => {
      setQuests(qs);
      const next: Record<string, Vote> = {};
      for (const q of qs as Sidequest[]) {
        next[q.id] = (q.my_vote ?? 0) as Vote;
      }
      setMyVotes(next);
    });
  }, [token]);

  async function handleVote(id: string, direction: 1 | -1) {
    if (!token) return;

    const prevVote: Vote = myVotes[id] ?? 0;
    const nextVote: Vote = prevVote === direction ? 0 : direction;
    const delta = nextVote - prevVote; // -2, -1, +1, +2
    if (delta === 0) return;

    // Optimistic update so UI responds instantly
    setMyVotes((prev) => ({ ...prev, [id]: nextVote }));
    setQuests((qs) =>
      qs
        .map((q) => (q.id === id ? { ...q, votes: q.votes + delta } : q))
        .sort((a, b) => b.votes - a.votes)
    );

    try {
      await voteQuest(token, id, delta);
    } catch (e) {
      console.error("Failed to vote on quest:", e);
      // Optionally reload from server if you want to fully sync:
      fetchQuests(timePeriod).then(setQuests);
      setMyVotes((prev) => ({ ...prev, [id]: prevVote }));
      // Reload from server to fully sync:
      fetchQuests(token).then(setQuests);
    }
  }

  async function handleSubmit(title: string, icon: string) {
    if (!token) return;
    const quest = await createQuest(token, title, icon);
    setQuests((qs) => [quest, ...qs]);
  }

  return (
    <div style={{ padding: 24, paddingRight: 48, backgroundColor: "#000000", minHeight: "100vh", position: "relative" }}>
      {/* react bit liquid background */}
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'fixed', 
        top: 0, 
        left: '200px', 
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
          <LiquidEther
            mouseForce={5}
            cursorSize={170}
            isViscous
            viscous={90}
            colors={["#5837a4","#2f54ca","#00ffee"]}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={2.2}
            isBounce={false}
            resolution={0.5}
          />
        </div>
      </div>
      
      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Trending Quests</h2>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Add Quest
          </button>
        </div>

        {/* Time period filter buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTimePeriod("all")}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid",
              background: timePeriod === "all" ? "var(--mint)" : "transparent",
              color: timePeriod === "all" ? "#000" : "var(--text)",
              borderColor: timePeriod === "all" ? "var(--mint)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: timePeriod === "all" ? 600 : 400,
            }}
          >
            All Time
          </button>
          <button
            onClick={() => setTimePeriod("month")}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid",
              background: timePeriod === "month" ? "var(--mint)" : "transparent",
              color: timePeriod === "month" ? "#000" : "var(--text)",
              borderColor: timePeriod === "month" ? "var(--mint)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: timePeriod === "month" ? 600 : 400,
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setTimePeriod("week")}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid",
              background: timePeriod === "week" ? "var(--mint)" : "transparent",
              color: timePeriod === "week" ? "#000" : "var(--text)",
              borderColor: timePeriod === "week" ? "var(--mint)" : "var(--muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: timePeriod === "week" ? 600 : 400,
            }}
          >
            This Week
          </button>
        </div>

      {quests.map((q, index) => (
        <SidequestCard
          key={q.id}
          quest={q}
          myVote={myVotes[q.id] ?? 0}
          onVote={handleVote}
          onShare={() => setShareQuestId(q.id)}
          index={index}
        />
      ))}
      {shareQuestId && (
        <ShareQuestModal
          questId={shareQuestId}
          onClose={() => setShareQuestId(null)}
        />
      )}

      {showModal && (
        <SubmitQuestModal
          onClose={() => setShowModal(false)}
          onSubmit={(q) => handleSubmit(q.title, q.icon)}
        />
      )}
      </div>
    </div>
  );
}

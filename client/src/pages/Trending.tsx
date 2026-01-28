import { useEffect, useState } from "react";
import type { Sidequest } from "../types/sidequest";
import SidequestCard from "../components/SidequestCard";
import SubmitQuestModal from "../components/SubmitQuestModal";
import ShareQuestModal from "../components/ShareQuestModal";
import { fetchQuests, createQuest, voteQuest, getQuestDifficulty } from "../services/api";
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
    fetchQuests({ period: timePeriod, token: token ?? undefined }).then(setQuests);
  }, [timePeriod, token]);
  
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});
  const [questDifficulties, setQuestDifficulties] = useState<Record<string, { difficulty: number; difficultyLabel: string }>>({});

  useEffect(() => {
    fetchQuests({ period: timePeriod, token: token ?? undefined }).then(async (qs) => {
      setQuests(qs);
      const next: Record<string, Vote> = {};
      for (const q of qs as Sidequest[]) {
        next[q.id] = (q.my_vote ?? 0) as Vote;
      }
      setMyVotes(next);

      // Fetch difficulty for each quest
      const difficultyPromises = (qs as Sidequest[]).map(async (q) => {
        try {
          const difficultyData = await getQuestDifficulty(q.id);
          const completionRate = difficultyData.completion_rate;

          // Determine difficulty level (same logic as in Home.tsx and Profile.tsx)
          let difficulty = 0;
          let difficultyLabel = "surface";
          if (completionRate >= 80) {
            difficulty = 1;
            difficultyLabel = "surface";
          } else if (completionRate >= 60) {
            difficulty = 2;
            difficultyLabel = "twilight";
          } else if (completionRate >= 40) {
            difficulty = 3;
            difficultyLabel = "midnight";
          } else if (completionRate >= 20) {
            difficulty = 4;
            difficultyLabel = "abyssal";
          } else if (completionRate >= 5) {
            difficulty = 5;
            difficultyLabel = "hadal";
          } else {
            difficulty = 5;
            difficultyLabel = "hadal";
          }

          return { questId: q.id, difficulty, difficultyLabel };
        } catch (error) {
          console.error(`Failed to fetch difficulty for quest ${q.id}:`, error);
          return null;
        }
      });

      const difficulties = await Promise.all(difficultyPromises);
      const difficultyMap: Record<string, { difficulty: number; difficultyLabel: string }> = {};
      for (const d of difficulties) {
        if (d) {
          difficultyMap[d.questId] = { difficulty: d.difficulty, difficultyLabel: d.difficultyLabel };
        }
      }
      setQuestDifficulties(difficultyMap);
    });
  }, [token, timePeriod]);

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
      fetchQuests({ period: timePeriod, token: token ?? undefined }).then(setQuests);
      setMyVotes((prev) => ({ ...prev, [id]: prevVote }));
      // Reload from server to fully sync:
      fetchQuests({ period: timePeriod, token: token ?? undefined }).then(setQuests);
    }
  }

  async function handleSubmit(title: string, icon: string) {
    if (!token) return;
    const quest = await createQuest(token, title, icon);
    setQuests((qs) => [quest, ...qs]);
  }

  return (
    <div style={{ padding: 24, paddingRight: 200, backgroundColor: "#000000", minHeight: "100vh", position: "relative" }}>
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
      
      {/* Fish decoration in right margin */}
      <div
        style={{
          position: "fixed",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <img src="/fish.svg" alt="" width={220} height={420} style={{ opacity: 0.4 }} />
      </div>

      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Trending Quests</h2>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/turtle.svg" alt="" width={24} height={24} style={{ opacity: 0.8 }} />
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

      {quests.map((q, index) => {
        const difficultyData = questDifficulties[q.id];
        return (
          <SidequestCard
            key={q.id}
            quest={q}
            myVote={myVotes[q.id] ?? 0}
            onVote={handleVote}
            onShare={() => setShareQuestId(q.id)}
            index={index}
            difficulty={difficultyData?.difficulty}
            difficultyLabel={difficultyData?.difficultyLabel}
          />
        );
      })}
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

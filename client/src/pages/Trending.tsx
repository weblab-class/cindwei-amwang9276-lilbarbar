import { useEffect, useState } from "react";
import type { Sidequest } from "../types/sidequest";
import SidequestCard from "../components/SidequestCard";
import SubmitQuestModal from "../components/SubmitQuestModal";
import ShareQuestModal from "../components/ShareQuestModal";
import { fetchQuests, createQuest, voteQuest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import LiquidEther from "../components/LiquidEther";



export default function Trending() {
  const { token } = useAuth();
  const [quests, setQuests] = useState<Sidequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [shareQuestId, setShareQuestId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests().then(setQuests);
  }, []);

  async function handleVote(id: string, delta: number) {
    if (!token) return;

    // Optimistic update so UI responds instantly
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
      fetchQuests().then(setQuests);
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Trending Quests</h2>
        <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/images/compass.svg" alt="" width={40} height={40} />
          Add Quest
        </button>
      </div>

      {quests.map((q, index) => (
        <SidequestCard
          key={q.id}
          quest={q}
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

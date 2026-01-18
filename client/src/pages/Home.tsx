import { useEffect, useState } from "react";
import type { Sidequest } from "../types/sidequest";
import SidequestCard from "../components/SidequestCard";
import SubmitQuestModal from "../components/SubmitQuestModal";
import ShareQuestModal from "../components/ShareQuestModal";
import { fetchQuests, createQuest, voteQuest } from "../services/api";
import { useAuth } from "../context/AuthContext";



export default function Home() {
  const { token } = useAuth();
  const [quests, setQuests] = useState<Sidequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [shareQuestId, setShareQuestId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests().then(setQuests);
  }, []);

  async function handleVote(id: string, delta: number) {
    if (!token) return;
    const updated = await voteQuest(token, id, delta);
    setQuests((qs) =>
      qs
        .map((q) => (q.id === id ? updated : q))
        .sort((a, b) => b.votes - a.votes)
    );
  }

  async function handleSubmit(title: string, icon: string) {
    if (!token) return;
    const quest = await createQuest(token, title, icon);
    setQuests((qs) => [quest, ...qs]);
  }

  return (
    <div style={{ padding: 24, paddingRight: 48, backgroundColor: "#000000", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Trending Quests</h2>
        <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/images/compass.svg" alt="" width={40} height={40} />
          Add Quest
        </button>
      </div>

      {quests.map((q) => (
        <SidequestCard
          key={q.id}
          quest={q}
          onVote={handleVote}
          onShare={() => setShareQuestId(q.id)}
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
  );
}

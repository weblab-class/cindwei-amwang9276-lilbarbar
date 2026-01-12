import { useState } from "react";
import SidequestCard from "../components/SidequestCard";
import SubmitQuestModal from "../components/SubmitQuestModal";
import type { Sidequest } from "../types/sidequest";

const INITIAL_QUESTS: Sidequest[] = [
  {
    id: "1",
    title: "Watch the sunrise somewhere new",
    icon: "🌅",
    votes: 12,
  },
  {
    id: "2",
    title: "Talk to a stranger and learn their story",
    icon: "🗣️",
    votes: 8,
  },
  {
    id: "3",
    title: "Walk 10k steps without headphones",
    icon: "🚶‍♀️",
    votes: 5,
  },
];

export default function Home() {
  const [quests, setQuests] = useState<Sidequest[]>(INITIAL_QUESTS);
  const [showModal, setShowModal] = useState(false);

  function handleVote(id: string, delta: number) {
    setQuests((qs) =>
      [...qs]
        .map((q) =>
          q.id === id ? { ...q, votes: q.votes + delta } : q
        )
        .sort((a, b) => b.votes - a.votes)
    );
  }

  function handleSubmit(newQuest: Sidequest) {
    setQuests((qs) => [newQuest, ...qs]);
  }

  function handleShare(id: string) {
    alert(`Sharing quest ${id} (Phase 4)`);
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2>Trending Sidequests</h2>
        <button onClick={() => setShowModal(true)}>+ New Quest</button>
      </div>

      {quests.map((q) => (
        <SidequestCard
          key={q.id}
          quest={q}
          onVote={handleVote}
          onShare={handleShare}
        />
      ))}

      {showModal && (
        <SubmitQuestModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

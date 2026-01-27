const API = import.meta.env.VITE_API_URL;

export async function fetchQuests() {
  const res = await fetch(`${API}/quests`);
  return res.json();
}


export async function createQuest(
  token: string,
  title: string,
  icon: string
) {
  const res = await fetch(`${API}/quests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, icon }),
  });
  return res.json();
}

export async function voteQuest(
  token: string,
  questId: string,
  delta: number
) {
  const res = await fetch(`${API}/quests/${questId}/vote?delta=${delta}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function sendFriendRequest(
  token: string,
  username: string
) {
  return fetch(
    `${API}/friends/request?username=${username}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function getIncomingRequests(token: string) {
  const res = await fetch(`${API}/friends/incoming`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function respondFriendRequest(
  token: string,
  requestId: string,
  accept: boolean
) {
  return fetch(
    `${API}/friends/${requestId}/respond?accept=${accept}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function getFriends(token: string) {
  const res = await fetch(`${API}/friends/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}


export async function fetchReceivedQuests(token: string) {
  const res = await fetch(`${API}/quests/received`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function completeQuest(
  token: string,
  questId: string
) {
  const res = await fetch(`${API}/quests/${questId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function shareQuest(
  token: string,
  questId: string,
  toUserId: string
) {
  const res = await fetch(`${API}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      quest_id: questId,
      to_user_id: toUserId,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to share quest");
  }

  return res.json();
}

export async function fetchCompletedQuests(token: string) {
  const res = await fetch(`${API}/quests/completed`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch completed quests");
  }

  return res.json();
}

// Posts API
export async function uploadPost(
  token: string,
  file: File,
  questId: string
) {
  // Upload via backend to avoid Cloudflare CORS issues.
  const form = new FormData();
  form.append("file", file);
  form.append("quest_id", questId);

  const res = await fetch(`${API}/posts/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to upload post");
  }

  return res.json();
}

export async function fetchPosts(token: string) {
  const res = await fetch(`${API}/posts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }

  return res.json();
}

export async function votePost(
  token: string,
  postId: string,
  delta: number
) {
  const res = await fetch(`${API}/posts/${postId}/vote?delta=${delta}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to vote on post");
  }

  return res.json();
}

export async function fetchComments(token: string, postId: string) {
  const res = await fetch(`${API}/posts/${postId}/comments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch comments");
  }

  return res.json();
}

export async function createComment(
  token: string,
  postId: string,
  content: string
) {
  const res = await fetch(`${API}/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to create comment");
  }

  return res.json();
}

// User / profile APIs
export async function fetchMe(token: string) {
  const res = await fetch(`${API}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch current user");
  }

  return res.json();
}

export async function uploadProfilePicture(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API}/users/me/pfp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to upload profile picture");
  }

  return res.json();
}

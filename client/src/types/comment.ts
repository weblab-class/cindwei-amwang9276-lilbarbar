export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username?: string | null;
  pfp_url?: string | null;
  content: string;
  created_at?: string | null;
}


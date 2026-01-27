export interface Post {
  id: string;
  quest_id: string;
  quest_title?: string;
  quest_icon?: string;
  media_url: string;
  media_type: 'image' | 'video';
  votes: number;
  my_vote?: -1 | 0 | 1;
  created_at?: string;
  poster_username?: string | null;
  poster_pfp_url?: string | null;
}

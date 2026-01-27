export interface Post {
  id: string;
  quest_id: string;
  quest_title?: string;
  quest_icon?: string;
  media_url: string;
  media_type: 'image' | 'video';
  votes: number;
  created_at?: string;
}

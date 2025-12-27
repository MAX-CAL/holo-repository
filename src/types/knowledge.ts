export interface Topic {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position_x: number;
  position_y: number;
  position_z: number;
  created_at: string;
  updated_at: string;
}

export interface Subtopic {
  id: string;
  topic_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  subtopic_id: string;
  user_id: string;
  title: string;
  content: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

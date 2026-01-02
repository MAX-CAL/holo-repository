export interface User {
  id: string;
  email: string | null;
  access_code: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  position_x: number;
  position_y: number;
  position_z: number;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  image_description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type ViewLevel = 'root' | 'category' | 'editor';

export interface NavigationState {
  level: ViewLevel;
  activeCategory: Category | null;
  activeSubcategory: Category | null;
}

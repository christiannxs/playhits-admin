export enum DesignerType {
  Fixed = 'fixed',
  Freelancer = 'freelancer'
}

export interface Designer {
  id: string; // Primary key from the 'designers' table
  auth_user_id: string; // Foreign key to auth.users.id
  name: string;
  username: string;
  type?: DesignerType;
  role: string;
  salary?: number;
}

export interface Task {
  id: string;
  description: string;
  designer_id: string;
  media_type: string;
  due_date: string; // YYYY-MM-DD
  created_at: string; // Supabase default timestamp
  value: number;
  artist: string;
  social_media: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Advance {
  id: string;
  designer_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
}

export type ViewType = 'dashboard' | 'tasks' | 'reports' | 'designers' | 'artists';

export type MediaType = {
  name: string;
  description: string;
  price: number;
};
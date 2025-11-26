
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
  designer_id: string;
  media_type: string;
  due_date: string; // YYYY-MM-DD
  created_at: string; // Supabase default timestamp
  value: number;
  artist?: string;
  social_media?: string;
  description?: string;
}

// Define um tipo específico para os dados que podem ser atualizados em uma tarefa.
export type UpdateTaskPayload = Pick<Task, 'designer_id' | 'media_type' | 'due_date' | 'artist' | 'social_media' | 'value' | 'description'>;


export interface Advance {
  id: string;
  designer_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
}

export type ViewType = 'dashboard' | 'tasks' | 'reports' | 'designers' | 'sql';

export type MediaType = {
  name: string;
  description: string;
  price: number;
};
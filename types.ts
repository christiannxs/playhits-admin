
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

/** Status de aprovação da demanda. Reprovada = paga 30% do valor. */
export type TaskApprovalStatus = 'approved' | 'rejected';

export interface Task {
  id: string;
  designer_id: string;
  media_type: string;
  due_date: string; // YYYY-MM-DD
  created_at: string; // Supabase default timestamp
  value: number;
  /** Se 'rejected', o valor pago é 30%. Omitido ou 'approved' = valor integral. */
  approval_status?: TaskApprovalStatus;
  artist?: string;
  social_media?: string;
  description?: string;
  /** ID da página no Notion (preenchido pela sincronização). */
  notion_page_id?: string | null;
}

// Define um tipo específico para os dados que podem ser atualizados em uma tarefa.
export type UpdateTaskPayload = Pick<Task, 'designer_id' | 'media_type' | 'due_date' | 'artist' | 'social_media' | 'value' | 'description' | 'approval_status'>;


export interface Advance {
  id: string;
  designer_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
}

export type ViewType = 'dashboard' | 'tasks' | 'financial-control' | 'reports' | 'designers';

export type MediaType = {
  name: string;
  description: string;
  price: number;
};
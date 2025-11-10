export enum DesignerType {
  Fixed = 'fixed',
  Freelancer = 'freelancer'
}

export interface Designer {
  id: string;
  name: string;
  username: string;
  password?: string;
  type?: DesignerType;
  role: string;
  salary?: number;
}

export interface Task {
  id: string;
  description: string;
  designerId: string;
  mediaType: string;
  dueDate: string; // YYYY-MM-DD
  createdDate: string; // ISO 8601 timestamp
  value: number;
  artist: string;
  socialMedia: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Advance {
  id: string;
  designerId: string;
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
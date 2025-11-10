import { Designer, Task, Artist, Advance, MediaType, DesignerType } from './types';

export const MEDIA_PRICES: Record<string, MediaType> = {
  'Motion': { 
    name: 'Motion', 
    description: 'AGENDA ANIMADA, HOJE ANIMADO, ARTE ANIMADA, VÍDEOS PLATAFORMAS (ouça agora, pré-save, 1 milhão, etc.) (Até 30 segundos)',
    price: 40.00 
  },
  'Teaser': { 
    name: 'Teaser', 
    description: 'MODELO TEASER, ACIMA DE 30s OU MAIS COMPLEXO (Geralmente de eventos)',
    price: 50.00 
  },
  'Flyer': { 
    name: 'Flyer', 
    description: 'AGENDA, HOJE, CAPA MÚSICA YOUTUBE, SIGA-ME, OUÇA-ME, CARD/PRESSKIT',
    price: 20.00 
  },
  'Catalogo/Carrossel': { 
    name: 'Catálogo/Carrossel', 
    description: 'PDF COM + DE 3 APRESENTAÇÕES, CARROSSEL, PROJETOS',
    price: 40.00 
  },
  'Outros': { 
    name: 'Outros', 
    description: 'MOLDURAS, DERIVAR FORMATO, TAPETES, MÍDIA DE SITE, OUTDOOR',
    price: 15.00 
  },
  'Ajuste': { 
    name: 'Ajuste', 
    description: 'PEQUENAS ALTERAÇÕES (A PARTIR DA 4)',
    price: 10.00 
  },
  'Criacao de ID': { 
    name: 'Criação de ID', 
    description: 'CAPA DE DVD, SINGLE, CD OFICIAL DO ARTISTA',
    price: 45.00 
  },
  'Onibus': { 
    name: 'Ônibus', 
    description: 'PLOTAGEM',
    price: 50.00 
  },
};

export const INITIAL_DESIGNERS: Designer[] = [
  { id: 'christian', name: 'Christian Rodrigues', username: 'christian', password: 'playhits2025', type: DesignerType.Fixed, role: 'Diretor de Arte', salary: 5000 },
  { id: 'financeiro', name: 'Financeiro', username: 'financeiro', password: 'playhits2025', role: 'Financeiro' },
  { id: 'murilo', name: 'Murilo Reversy', username: 'murilo', password: 'playhits2025', type: DesignerType.Fixed, role: 'Designer', salary: 3000 },
  { id: 'gustavo', name: 'Gustavo Foshi', username: 'gustavo', password: 'playhits2025', type: DesignerType.Fixed, role: 'Designer', salary: 3000 },
  { id: 'joao', name: 'João Viana', username: 'joao', password: 'playhits2025', type: DesignerType.Freelancer, role: 'Freelancer' },
  { id: 'william', name: 'William Marques', username: 'william', password: 'playhits2025', type: DesignerType.Freelancer, role: 'Freelancer' },
];

export const INITIAL_ARTISTS: Artist[] = [
    { id: '1', name: 'Zé Neto e Cristiano' },
    { id: '2', name: 'Maiara e Maraisa' },
    { id: '3', name: 'Jorge e Mateus' },
    { id: '4', name: 'Hugo e Guilherme' },
];

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const lastWeek = new Date(today);
lastWeek.setDate(today.getDate() - 7);

export const INITIAL_TASKS: Task[] = [
  { id: '1', description: 'Agenda da semana', designerId: 'joao', mediaType: 'Flyer', dueDate: today.toISOString().split('T')[0], createdDate: yesterday.toISOString(), value: 20.00, artist: 'Zé Neto e Cristiano', socialMedia: 'Ana' },
  { id: '2', description: 'Vídeo de pré-save', designerId: 'joao', mediaType: 'Motion', dueDate: today.toISOString().split('T')[0], createdDate: yesterday.toISOString(), value: 40.00, artist: 'Maiara e Maraisa', socialMedia: 'Bia' },
  { id: '3', description: 'Carrossel de fotos', designerId: 'william', mediaType: 'Catalogo/Carrossel', dueDate: today.toISOString().split('T')[0], createdDate: today.toISOString(), value: 40.00, artist: 'Jorge e Mateus', socialMedia: 'Carlos' },
  { id: '4', description: 'Ajuste no outdoor', designerId: 'murilo', mediaType: 'Ajuste', dueDate: today.toISOString().split('T')[0], createdDate: today.toISOString(), value: 10.00, artist: 'Hugo e Guilherme', socialMedia: 'Dani' },
  { id: '5', description: 'Agenda da semana passada', designerId: 'william', mediaType: 'Flyer', dueDate: lastWeek.toISOString().split('T')[0], createdDate: lastWeek.toISOString(), value: 20.00, artist: 'Zé Neto e Cristiano', socialMedia: 'Ana' },
];

export const INITIAL_ADVANCES: Advance[] = [
    { id: '1', designerId: 'joao', amount: 50, date: today.toISOString().split('T')[0], description: 'Adiantamento semanal' }
];
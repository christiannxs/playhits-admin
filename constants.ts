
import { MediaType } from './types';

export const MEDIA_PRICES: Record<string, MediaType> = {
  'Motion': { 
    name: 'Motion', 
    description: 'AGENDA ANIMADA, HOJE ANIMADO, ARTE ANIMADA, VÍDEOS PLATAFORMAS (ouça agora, pré-save, 1 milhão, etc.) (Até 30 segundos)',
    price: 35.00 
  },
  'Teaser': { 
    name: 'Teaser', 
    description: 'MODELO TEASER, ACIMA DE 30s OU MAIS COMPLEXO (Geralmente de eventos)',
    price: 45.00 
  },
  'Flyer': { 
    name: 'Flyer', 
    description: 'AGENDA, HOJE, CAPA MÚSICA YOUTUBE, SIGA-ME, OUÇA-ME, CARD/PRESSKIT',
    price: 18.00 
  },
  'Catalogo/Carrossel': { 
    name: 'Catálogo/Carrossel', 
    description: 'PDF COM + DE 3 APRESENTAÇÕES, CARROSSEL, PROJETOS',
    price: 35.00 
  },
  'Outros': { 
    name: 'Outros', 
    description: 'MOLDURAS, DERIVAR FORMATO, TAPETES, MÍDIA DE SITE, OUTDOOR',
    price: 12.00 
  },
  'Ajuste': { 
    name: 'Ajuste', 
    description: 'PEQUENAS ALTERAÇÕES (A PARTIR DA 4)',
    price: 10.00 
  },
  'Criacao de ID': { 
    name: 'Criação de ID', 
    description: 'CAPA DE DVD, SINGLE, CD OFICIAL DO ARTISTA',
    price: 40.00 
  },
  'Onibus': { 
    name: 'Ônibus', 
    description: 'PLOTAGEM',
    price: 45.00 
  },
  'Plantão Final de Semana': { 
    name: 'Plantão Final de Semana', 
    description: 'PLANTÃO FINAL DE SEMANA',
    price: 110.00 
  },
};

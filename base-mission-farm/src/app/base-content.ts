export type ProjectPair = {
  id: string;
  index: string;
  name: string;
  description: string;
  details: string[];
  before: {
    src: string;
    alt: string;
  };
  after: {
    src: string;
    alt: string;
  };
};

export type ExploreMedia = {
  id: string;
  type: 'photo' | 'video';
  name: string;
  caption: string;
  src: string;
  poster?: string;
  alt: string;
};

export const projectPairs: ProjectPair[] = [
  {
    id: 'corredor',
    index: '01',
    name: 'Corredor de acolhimento',
    description: 'O caminho simples ganha estrutura, luz e circulação para receber pessoas com dignidade.',
    details: ['fluxo claro', 'acabamento funcional', 'acolhimento desde a chegada'],
    before: {
      src: 'assets/base/project/before-corridor.jpeg',
      alt: 'Corredor atual da Base Mission Farm antes da reforma',
    },
    after: {
      src: 'assets/base/project/after-corridor.jpeg',
      alt: 'Projeto visual do corredor reformado da Base Mission Farm',
    },
  },
  {
    id: 'dormitorio',
    index: '02',
    name: 'Dormitório missionário',
    description: 'Um ambiente preparado para descanso, formação e convivência durante os períodos de missão.',
    details: ['8 lugares', '4 beliches', 'banheiro privativo', 'ventilação cruzada'],
    before: {
      src: 'assets/base/project/before-dormitory.jpeg',
      alt: 'Dormitório atual da Base Mission Farm antes da reforma',
    },
    after: {
      src: 'assets/base/project/after-dormitory.jpeg',
      alt: 'Projeto visual do dormitório reformado da Base Mission Farm',
    },
  },
];

export const exploreItems: ExploreMedia[] = [
  {
    id: 'walkthrough',
    type: 'video',
    name: 'Caminhada pelo terreno',
    caption: 'Um registro real do que já existe e do espaço que será preparado.',
    src: 'assets/base/videos/caminhada-terreno.mp4',
    poster: 'assets/base/photos/caminho-jardim.jpeg',
    alt: 'Vídeo de caminhada pela Base Mission Farm',
  },
  {
    id: 'courtyard',
    type: 'photo',
    name: 'Construções e pátio',
    caption: 'Estruturas existentes para encontros, cuidado e serviço.',
    src: 'assets/base/photos/construcoes-patio.jpeg',
    alt: 'Construções e pátio do terreno da Base Mission Farm',
  },
  {
    id: 'porch',
    type: 'photo',
    name: 'Varanda interior',
    caption: 'Um lugar de transição entre casa, comunidade e missão.',
    src: 'assets/base/photos/varanda-interior.jpeg',
    alt: 'Varanda interior da Base Mission Farm',
  },
  {
    id: 'interior',
    type: 'photo',
    name: 'Ambiente interno',
    caption: 'Espaços que serão organizados para ensino, escuta e preparo.',
    src: 'assets/base/photos/ambiente-interno.jpeg',
    alt: 'Ambiente interno da Base Mission Farm',
  },
  {
    id: 'arrival',
    type: 'photo',
    name: 'Entrada',
    caption: 'A primeira imagem de quem chega para ser formado e enviado.',
    src: 'assets/base/photos/entrada.jpeg',
    alt: 'Entrada da Base Mission Farm',
  },
  {
    id: 'detail',
    type: 'photo',
    name: 'Terra e detalhes',
    caption: 'O começo concreto de uma visão que está sendo construída.',
    src: 'assets/base/photos/detalhe-terreno.jpeg',
    alt: 'Detalhe do terreno da Base Mission Farm',
  },
];

export const contributionValues = [50, 100, 250, 500, 1000];

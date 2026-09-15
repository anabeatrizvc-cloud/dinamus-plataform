export type EnvironmentMedia = {
  id: string;
  name: string;
  description: string;
  image: string;
  alt: string;
};

export type GalleryMedia = {
  id: string;
  type: 'photo' | 'video';
  name: string;
  caption: string;
  src: string;
  poster?: string;
  alt: string;
};

export const environments: EnvironmentMedia[] = [
  {
    id: 'caminho',
    name: 'Caminho e jardim',
    description: 'A chegada revela um espaço simples, aberto e pronto para receber pessoas.',
    image: 'assets/base/photos/caminho-jardim.jpeg',
    alt: 'Caminho em meio ao jardim da Base Mission Farm',
  },
  {
    id: 'patio',
    name: 'Construções e pátio',
    description: 'Estruturas existentes apontam para serviço, encontros e preparação.',
    image: 'assets/base/photos/construcoes-patio.jpeg',
    alt: 'Construções e pátio no terreno da Base Mission Farm',
  },
  {
    id: 'varanda',
    name: 'Varanda interior',
    description: 'Ambientes cobertos que preservam a sensação de acolhimento e comunidade.',
    image: 'assets/base/photos/varanda-interior.jpeg',
    alt: 'Varanda interna da Base Mission Farm',
  },
  {
    id: 'interno',
    name: 'Ambiente interno',
    description: 'Espaços simples que podem apoiar conversas, ensino e cuidado.',
    image: 'assets/base/photos/ambiente-interno.jpeg',
    alt: 'Ambiente interno de uma das construções da Base Mission Farm',
  },
  {
    id: 'entrada',
    name: 'Entrada',
    description: 'Um ponto de chegada para quem vai ser formado, servido e enviado.',
    image: 'assets/base/photos/entrada.jpeg',
    alt: 'Entrada do terreno da Base Mission Farm',
  },
  {
    id: 'detalhe',
    name: 'Terra e detalhe',
    description: 'A beleza real está no começo: gente, terra, oração e propósito.',
    image: 'assets/base/photos/detalhe-terreno.jpeg',
    alt: 'Detalhe do terreno da Base Mission Farm',
  },
];

export const galleryItems: GalleryMedia[] = [
  {
    id: 'caminho',
    type: 'photo',
    name: 'Caminho e jardim',
    caption: 'A chegada pela área verde da Base.',
    src: 'assets/base/photos/caminho-jardim.jpeg',
    alt: 'Caminho e jardim da Base Mission Farm',
  },
  {
    id: 'patio',
    type: 'photo',
    name: 'Construções e pátio',
    caption: 'Área comum com construções existentes.',
    src: 'assets/base/photos/construcoes-patio.jpeg',
    alt: 'Pátio e construções da Base Mission Farm',
  },
  {
    id: 'varanda',
    type: 'photo',
    name: 'Varanda interior',
    caption: 'Entrada coberta da casa e varanda.',
    src: 'assets/base/photos/varanda-interior.jpeg',
    alt: 'Varanda interna da Base Mission Farm',
  },
  {
    id: 'ambiente-interno',
    type: 'photo',
    name: 'Ambiente interno',
    caption: 'Espaço interno existente na casa.',
    src: 'assets/base/photos/ambiente-interno.jpeg',
    alt: 'Ambiente interno da Base Mission Farm',
  },
  {
    id: 'entrada',
    type: 'photo',
    name: 'Entrada',
    caption: 'Uma das entradas do terreno.',
    src: 'assets/base/photos/entrada.jpeg',
    alt: 'Entrada da Base Mission Farm',
  },
  {
    id: 'detalhe',
    type: 'photo',
    name: 'Detalhes do terreno',
    caption: 'Registros reais dos espaços da Base.',
    src: 'assets/base/photos/detalhe-terreno.jpeg',
    alt: 'Detalhe do terreno da Base Mission Farm',
  },
  {
    id: 'caminhada',
    type: 'video',
    name: 'Caminhada pelo terreno',
    caption: 'Vídeo real de caminhada pela Base.',
    src: 'assets/base/videos/caminhada-terreno.mp4',
    poster: 'assets/base/photos/caminho-jardim.jpeg',
    alt: 'Vídeo de caminhada pelo terreno da Base Mission Farm',
  },
];

export const contributionValues = [50, 100, 250, 500, 1000];

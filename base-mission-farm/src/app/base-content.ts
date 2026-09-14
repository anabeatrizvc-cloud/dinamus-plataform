export type EnvironmentMedia = {
  id: string;
  name: string;
  description: string;
  image: string;
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

export const contributionValues = [50, 100, 250, 500, 1000];

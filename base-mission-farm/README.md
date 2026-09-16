# Base Mission Farm

## Referencia visual

A fonte desta implementacao e `../pacote_base_mission_farm/`: `VISAO_DO_PASTOR.md`,
`PROMPT_CODEX.md` e os dois mockups de narrativa. Esse pacote substitui as referencias
de `Base_Mission_Farm_Codex_FINAL`.

A ordem da pagina e terreno atual, comparacao aerea e video, corredor e dormitorio,
galeria real e contribuicao. O convite fixo aparece ao entrar na segunda etapa,
permanece nas seguintes e fica oculto ao voltar ao hero. Nao existe modal automatico.

A abertura ocupa exatamente `100dvh` no desktop e no mobile, acompanhando mudancas
da viewport. A revisao solicitada no teste local remove os 28 px de antecipacao da
secao seguinte; os controles continuam respeitando as safe areas.

As fotos dos ambientes aparecem lado a lado, como nos mockups, com acesso ao arquivo
completo em "Conheca o projeto". As perspectivas diferentes nao sao sobrepostas.

## Identidade e arquivos

- Sora e Lora sao servidas localmente. Os quatro pesos utilizados foram convertidos
  dos TTF existentes para WOFF2, sem mudar os desenhos. As fontes principais tem preload.
- `brand/logo-base-horizontal.svg` e uma vetorizacao automatica do simbolo e lettering
  do brandbook `07` (Potrace, limiar 136, tolerancia 0,15), sem fonte substituta ou
  marca inventada. Os recortes de origem sao `238,75,144,116` e `109,207,400,122`.
  A navbar usa um unico arquivo vetorial, sem filtros ou recortes em tempo de execucao.
  O PNG `08` tem transparencia, mas usa uma variante de simbolo diferente do mockup.
- Hero desktop e mobile usam a mesma tomada atual `09` e o poster `11`.
- "Hoje" usa o poster atual `12`; "A visao" usa um frame a 6,8 s do video `05`.
- Os quatro arquivos de arquitetura permanecem intactos.
- A fotografia isolada da placa de madeira do encerramento desktop nao veio no
  pacote. O encerramento usa a foto real da varanda ja existente. O mockup nao foi
  recortado para servir como fotografia, e uma placa nova nao foi inventada.

## Video

O original `final-project.mov` foi preservado. As versoes web mantem 480 x 848,
24 fps e aproximadamente 7 segundos, sem audio:

- `final-project.mp4`: H.264, CRF 23, yuv420p e faststart.
- `final-project.webm`: VP9, CRF 32, alternativa para navegadores compativeis.
- `project/aerial-future.jpg`: poster extraido do proprio video, sem gerar arquitetura.

O video de transformacao so inicia mediante acao do visitante. No celular, essa
acao traz o video para a area visivel. O hero respeita a preferencia por movimento
reduzido e oferece controle de reproducao.

## Dados e desenvolvimento

Totais, etapas e Pix continuam vindo de `/api/v1/mission-base` e
`/api/v1/mission-base/pix`. Gerar Pix nao registra pagamento nem altera progresso.
As telas administrativas e seus endpoints foram preservados.

Execute `npm start` nesta pasta para abrir `http://127.0.0.1:4300/base/`.
O servidor de desenvolvimento permite inspecionar o visual; a API precisa estar
disponivel na mesma origem para carregar metas e gerar Pix. Em producao isso e
feito pelo reverse proxy existente. Sem API, a pagina mostra o erro e permite
tentar novamente, sem preencher valores ficticios.

Verificacoes:

- Instale os navegadores de teste em `../frontend` com
  `npx playwright install --with-deps chromium webkit`.
- Nesta pasta: `npm run build`.
- Em `../frontend`: `npm run e2e:base` (Chromium desktop e WebKit/iPhone).
- Os testes geram capturas em `../frontend/test-results/` e usam dados simulados
  somente dentro dos testes, sem enviar pagamentos ou alterar registros reais.
- O projeto da Base nao possui comando de lint configurado.

WebKit emulado nao substitui a verificacao em um iPhone fisico.

Na revisao inicial da narrativa passaram 12 testes de navegador e 2 testes existentes
do backend (Pix, totais e administracao). Na revisao de altura, logo e fontes passaram
4 verificacoes focadas em Chromium e WebKit: carregamento da marca e das fontes,
capturas da abertura e redimensionamento da viewport. O teste aceita apenas a
fracao de pixel produzida pelo calculo de `dvh` no WebKit, nao espacos visiveis.
A repeticao do percurso completo teve timeouts neste ambiente local.

## Arquivos alterados

- `src/app/app.component.{ts,html,scss}`: narrativa, marca, navegacao e contribuicao.
- `src/index.html` e `src/styles.scss`: identidade da pagina e comparacao sem JavaScript.
- `public/assets/base/brand/logo-base-horizontal.svg` e quatro fontes WOFF2 em `public/assets/base/fonts/`.
- `public/assets/base/project/aerial-future.jpg` e `public/assets/base/videos/final-project.{mp4,webm}`.
- `package.json` e `package-lock.json`: icones Lucide, usando o mesmo pacote do frontend principal.
- `../frontend/playwright.base.config.ts`, `../frontend/e2e-base/narrative.spec.ts`
  e `../frontend/package.json`: verificacoes da pagina independente em `/base/`.

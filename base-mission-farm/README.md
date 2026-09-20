# Base Mission Farm

## Referencia visual

A fonte desta implementacao e `../pacote_base_mission_farm/`: `VISAO_DO_PASTOR.md`,
`PROMPT_CODEX.md`, `AJUSTES_PASTOR_20-09.md`, os dois mockups de narrativa e o mockup
da camada de contribuicao. Esse pacote substitui as referencias
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

## Videos

O original `final-project.mov` foi preservado. As versoes web mantem 480 x 848,
24 fps e aproximadamente 7 segundos, sem audio:

- `final-project.mp4`: H.264, CRF 23, yuv420p e faststart.
- `final-project.webm`: VP9, CRF 32, alternativa para navegadores compativeis.
- `project/aerial-future.jpg`: poster extraido do proprio video, sem gerar arquitetura.

O primeiro poster e uma copia do asset `15`, nao o frame de comparacao aerea.
O segundo video e o asset `13`, remuxado sem recodificacao para MP4 com faststart;
mantem imagem, proporcao vertical e duracao de aproximadamente 10 segundos.
Seu poster e uma copia do asset `14`. Os originais do pacote permanecem intactos.

A colecao em `src/app/base-content.ts` permite acrescentar videos sem duplicar
markup. Desktop apresenta dois itens lado a lado; mobile usa carrossel com snap,
indicador, setas e teclado. As fontes dos videos so sao atribuidas apos o clique.
Cada player tem controles em Sora, inicia sem som e pausa os outros videos.
Videos fora da viewport ou em aba oculta sao pausados. O hero preservado respeita
movimento reduzido/economia de dados e mantem o poster ate haver um frame pronto.

## Dados e desenvolvimento

Metas e destinacoes vem de `/api/v1/mission-base`. A pagina publica possui somente
Aquisição e Revitalização, com percentuais e restante derivados no backend. Uma
meta ausente/zero preserva a barra neutra; excedentes permanecem no valor e no
percentual, limitando apenas a largura visual da barra. Nenhum dado e simulado
na aplicacao.

O CTA abre um drawer desktop ou bottom sheet mobile, com foco contido, fechamento
por X/Escape/clique fora e restauracao de foco e rolagem. Os seis links Asaas sao
gerais, abertos com `noopener noreferrer`, sem selecao de destino, QR, webhook
ou conciliacao. O endpoint Pix legado continua disponivel para consumidores
anteriores; gerar Pix nao registra pagamento nem altera progresso.

O painel `/admin/base-missionaria` permite editar titulo, proposito, meta,
destinado confirmado, visibilidade e ordem das duas frentes. API e reset exigem
ADMIN e a versao publicada; conflito retorna 409, preserva o rascunho e exige
recarregamento confirmado. Datas/usuarios e eventos de auditoria sao registrados
no backend. Os dados antigos de Reforma/Construção sao projetados em Revitalização
na leitura, sem escrita automatica. O primeiro salvamento versionado guarda o
snapshot original em `legacyStages`. Reset nao apaga esse historico.

Execute `npm start` nesta pasta para abrir `http://127.0.0.1:4300/base/`.
O proxy local encaminha `/api` para `http://127.0.0.1:8080`. Inicie o backend com
`./mvnw mn:run` em `../backend` (padrao local em memoria, sem dados de producao).
Em producao o encaminhamento da API e
feito pelo reverse proxy existente. Sem API, a pagina mostra o erro e permite
tentar novamente, sem preencher valores ficticios.

Verificacoes:

- Instale os navegadores de teste em `../frontend` com
  `npx playwright install --with-deps chromium webkit`.
- Nesta pasta: `npm run build`.
- Em `../frontend`: `npm run build`, `npm test -- --watch=false`,
  `npm run e2e -- e2e/mission-base.spec.ts` e `npm run e2e:base`.
- Em `../backend`: `./mvnw test`. Os testes de CouchDB real exigem explicitamente
  `-Ddnms.testcontainers=true`; o contrato HTTP/revisao e testado com servidor local.
- Os testes geram capturas em `../frontend/test-results/` e usam dados simulados
  somente dentro dos testes, sem enviar pagamentos ou alterar registros reais.
- Nao existe comando de lint nos projetos Angular. Verifique a formatacao dos
  arquivos da Base e testes com Prettier e execute `git diff --check`.
- A prova tipografica e gerada pelo teste "Sora really renders":
  `computed-fonts.json` verifica as familias e `document.fonts.check` nos pesos
  400/600/700; `rendered-fonts.json` confirma os glifos realmente renderizados em
  fontes customizadas Sora via CDP no Chromium. Lora fica nos titulos editoriais.

WebKit emulado nao substitui a verificacao em um iPhone fisico.

## Arquivos alterados

- `src/app/app.component.{ts,html,scss}`: narrativa, navegacao e contribuicao.
- `src/app/story-video.component.*`: player inline e controles tipograficos locais.
- `src/app/base-content.ts`: colecao de videos e seis URLs aprovados do Asaas.
- `src/index.html` e `src/styles.scss`: identidade da pagina e comparacao sem JavaScript.
- `public/assets/base/project/transformation-*-poster.jpg` e
  `public/assets/base/videos/transformation-vertical.mp4`: novos assets do pacote.
- Logo, fontes, hero, arquitetura e video original ja existentes foram preservados.
- `../backend/src/`: modelo/DTO/use case/repositorios da campanha e testes.
- `../frontend/src/app/features/admin/admin-module.page.*`, servico e modelos:
  administracao versionada das duas frentes.
- `../frontend/playwright.base.config.ts`, `../frontend/e2e-base/narrative.spec.ts`
  e `../frontend/package.json`: verificacoes da pagina independente em `/base/`.

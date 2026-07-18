# DNMS Platform

Plataforma Configuration First para a Igreja Dinamus Recife.

## Estrutura

- `frontend/`: Angular standalone, signals, reactive forms, PWA, Playwright.
- `backend/`: Micronaut, Clean Architecture e Ports & Adapters.
- `infrastructure/`: reverse proxy nginx.
- `docs/design-assets/`: identidade visual oficial.

## Requisitos Locais

- Node 24.14.1 ou superior compatível com Angular 21.
- Java 21.
- Maven ou `backend/mvnw`.
- Docker 29+ para o ambiente integrado.

## Execucao

Frontend:

```bash
cd frontend
npm install
npm start
```

Backend:

```bash
cd backend
./mvnw mn:run
```

Docker:

```bash
docker compose up --build
```

## Credenciais de Desenvolvimento

- Email: `admin@dinamus.local`
- Senha: `dnms-admin`

## Testes

```bash
cd frontend
npm test -- --watch=false
npm run build

cd ../backend
./mvnw test
```

Teste CouchDB com Testcontainers:

```bash
cd backend
./mvnw test -Ddnms.testcontainers=true
```

No ambiente local atual, Testcontainers pode exigir ajuste da stack docker-java caso o daemon recuse clientes abaixo da Docker API 1.40. A validacao integrada com CouchDB tambem foi executada via `docker compose up -d`.

Playwright:

```bash
cd frontend
npm run e2e
```

## Arquitetura

O backend separa:

- `domain`: modelos de negocio.
- `application`: casos de uso e portas.
- `adapters/in`: HTTP controllers, filtros e DTOs.
- `adapters/out`: persistencia, JWT, hash de senha e auditoria.

O frontend separa:

- `core`: API, auth, guards e modelos.
- `shared`: componentes reutilizaveis.
- `features`: publico, auth e admin.

## Decisoes

- Angular 22.0.7 foi verificado no npm, mas o ambiente local tem Node 24.14.1 e a CLI 22 exige 24.15.0 ou superior. A implementacao usa Angular 21.2.x para permitir build e testes locais.
- A Home usa recortes derivados de `docs/design-assets/home-aprovada.png` para manter fotografias, cards e wordmark aprovados.
- CouchDB e habilitado por `COUCHDB_ENABLED=true`; em desenvolvimento local sem Docker o backend usa repositorio em memoria.

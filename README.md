# NFe Emission Suite

Monorepo containing the backend API, React SPA, database schema, and Docker Swarm stack described in the NF-e (modelo 55) Minas Gerais scope.

## Backend (`backend`)

- Express + TypeScript API that exposes `POST /api/empresa`, `POST /api/nfe/emitir`, and `GET /api/nfe/:id/pdf`.
- PostgreSQL schema with `empresas`, `notas_fiscais` e `itens_nota`, and helper scripts in `db/migrations`.
- Certificate encryption (AES-256), token-based identification, automatic CFOP logic, XML storage, and PDF generation via PDFKit.
- Run with `npm install` + `npm run dev` inside `backend`.

## Frontend (`frontend`)

- Vite + React SPA with company registration (PFX upload + token generation) and manual NF-e issuance forms.
- Calls the API host defined by `VITE_API_URL` (defaults to `http://localhost:3000`) so you can point it to `https://api.allentiomolu.com.br` in production.
- Run with `npm install` + `npm run dev` inside `frontend`.

## Infrastructure

- `stack-nfe.yml` deploys the API, frontend, and PostgreSQL on Docker Swarm with Traefik labels and the `minharede` overlay network.

## Getting started

1. Provision PostgreSQL using the migration `backend/db/migrations/001-schema.sql`.
2. Configure `.env` for the backend (see `.env.example`), run `npm install` and `npm run dev` (or `npm run build` + `npm start` inside the container).
3. Start the frontend locally with `npm run dev` (or `npm run build` inside `frontend` + serve via Docker) and point it at the running API, e.g. `VITE_API_URL=https://api.allentiomolu.com.br npm run dev`.
4. Use the React form or the REST endpoints to register a company, obtain the token, and emit NF-e (PDF only, XML saved internally).

## Deploy simples em Ubuntu

1. Instale dependências:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql
   sudo npm install -g pm2
   ```
2. Configure o PostgreSQL (crie banco e execute `backend/db/migrations/001-schema.sql`). Para testes rápidos pode usar `psql -U postgres -d nfe_db -f backend/db/migrations/001-schema.sql`.
3. No backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env && edite conforme seus dados
   npm run build
   pm2 start dist/index.js --name nfe-api --watch
   ```
4. No frontend:
   ```bash
   cd ../frontend
   npm install
   npm run build
   npx serve -s dist -l 80
   ```
5. Ajuste o nginx do servidor (opcional) para fazer proxy das portas `3000` e `80` para `api.allentiomolu.com.br` e `app.allentiomolu.com.br`.

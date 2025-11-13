# NFe Emission Suite

Monorepo containing the backend API, React SPA, database schema, and Docker Swarm stack described in the NF-e (modelo 55) Minas Gerais scope.

## Backend (`backend`)

- Express + TypeScript API that exposes `POST /api/empresa`, `POST /api/nfe/emitir`, and `GET /api/nfe/:id/pdf`.
- PostgreSQL schema with `empresas`, `notas_fiscais` e `itens_nota`, and helper scripts in `db/migrations`.
- Certificate encryption (AES-256), token-based identification, automatic CFOP logic, XML storage, and PDF generation via PDFKit.
- Run with `npm install` + `npm run dev` inside `backend`.

## Frontend (`frontend`)

- Vite + React SPA with company registration (PFX upload + token generation) and manual NF-e issuance forms.
- Calls `/api/nfe/emitir` (bearer token) to request a PDF and renders a DANFE download link.
- Run with `npm install` + `npm run dev` inside `frontend`.

## Infrastructure

- `stack-nfe.yml` deploys the API, frontend, and PostgreSQL on Docker Swarm with Traefik labels and the `minharede` overlay network.

## Getting started

1. Provision PostgreSQL using the migration `backend/db/migrations/001-schema.sql`.
2. Configure `.env` for the backend (see `.env.example`), run `npm install` and `npm run dev` (or `npm run build` + `npm start` inside the container).
3. Start the frontend locally with `npm run dev` (or `npm run build` inside `frontend` + serve via Docker) and point it at the running API.
4. Use the React form or the REST endpoints to register a company, obtain the token, and emit NF-e (PDF only, XML saved internally).

## Docker build & deploy

1. Build the API image:
   ```bash
   docker build -t minha-registry/nfe-api:latest backend
   ```
2. Build the frontend image (the Dockerfile copies `dist/` into an nginx container that listens on port 80):
   ```bash
   docker build -t minha-registry/nfe-frontend:latest frontend
   ```
3. Push the images and deploy `stack-nfe.yml` in your Docker Swarm; Traefik will know how to route `api.allentiomolu.com.br` and `app.allentiomolu.com.br` to the proper services exposing ports 3000 and 80 respectively.

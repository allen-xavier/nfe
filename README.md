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
2. Configure `.env` for the backend (see `.env.example`) and start with `npm run dev`.
3. Start the frontend with `npm run dev` and point it at the running API.
4. Use the React form or the REST endpoints to register a company, obtain the token, and emit NF-e (PDF only, XML saved internally).

# NFe Emission Suite

Monorepo containing the backend API, React SPA, database schema, and Docker Swarm stack described in the NF-e (modelo 55) Minas Gerais scope.

## Backend (`backend`)

- Express + TypeScript API that exposes `POST /api/empresa`, `POST /api/nfe/emitir`, and `GET /api/nfe/:id/pdf`.
- PostgreSQL schema with `empresas`, `notas_fiscais` e `itens_nota`, and helper scripts in `db/migrations`.
- Certificate encryption (AES-256), token-based identification, automatic CFOP logic, XML storage, and PDF generation via PDFKit.
- Run with `npm install` + `npm run dev` inside `backend`.

## Frontend (`frontend`)

- Vite + React SPA with company registration (PFX upload + token generation) and manual NF-e issuance forms.
- Calls the API host defined by `VITE_API_URL` (defaults to `https://api.allentiomolu.com.br` when you build for production via `.env.production`, or `http://localhost:3000` while you develop).
- Run with `npm install` + `npm run dev` inside `frontend`.

## Infrastructure

- `stack-nfe.yml` deploys the API, frontend, and PostgreSQL on Docker Swarm with Traefik labels and the `minharede` overlay network.

## Getting started

1. Provision PostgreSQL using the migration `backend/db/migrations/001-schema.sql`.
2. Configure `.env` for the backend (see `.env.example`), run `npm install` and `npm run dev` (or `npm run build` + `npm start` inside the container). The `NFE_MODELO`, `NFE_FORMA_EMISSAO`, and `SEFAZ_AMBIENTE` vars control how the access key is generated and which SEFAZ endpoint is used (homologation or production). Each company contributes its own `UF`/`CNPJ` and certificate when signing the XML; the system now selects the state-specific authorization and receipt URLs automatically.
3. Start the frontend locally with `npm run dev` (or `npm run build` inside `frontend` + serve via Docker) and point it at the running API, e.g. `VITE_API_URL=https://api.allentiomolu.com.br npm run dev`.
4. Use the React form or the REST endpoints to register a company, obtain the token, and emit NF-e (PDF only, XML saved internally).

## Deploy simples em Ubuntu

1. Instale dependências:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql
   sudo npm install -g pm2
   ```
2. Configure o PostgreSQL (crie banco e execute `backend/db/migrations/001-schema.sql`). Use `psql -U nfe -d nfe_db -f backend/db/migrations/001-schema.sql` para aplicar. Se precisar reaplicar alterações na coluna `cep`, `crt` ou adicionar `protocolo` e `recibo`, rode (usando o usuário `nfe`):
   ```sql
   ALTER TABLE empresas ALTER COLUMN cep TYPE VARCHAR(20);
   ALTER TABLE empresas ALTER COLUMN crt TYPE TEXT;
   ALTER TABLE notas_fiscais ADD COLUMN protocolo VARCHAR(50);
   ALTER TABLE notas_fiscais ADD COLUMN recibo VARCHAR(20);
   ```
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

## Deploy automatizado

Use `scripts/deploy.sh` (lembre-se de dar `chmod +x scripts/deploy.sh`) para construir backend/frontend, enviar as imagens e redeployar a stack com Traefik. Ele já executa `npm install && npm run build` em cada serviço e faz `docker stack deploy -c stack-nfe.yml nfe`.

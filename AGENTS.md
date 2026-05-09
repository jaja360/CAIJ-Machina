# AGENTS.md

## Carte du dépôt

- Prototype BCF de veille juridique/réglementaire « juste à temps »; le défi est décrit dans `Description_Défi_BCF.md`.
- Backend Go dans `Code/`; frontend Next.js dans `frontend/`. Il n’y a pas de workspace/task runner racine, Makefile, Dockerfile ou CI GitHub.
- Les PDF et exemples sous `Ressources Techniques - Technical Resources/` sont des ressources externes; `documents/` et `Code/contracts/` servent aussi de fixtures aux tests de chunking.

## Backend Go (`Code/`)

- Module `github.com/jaja360/CAIJ-Machina`, `go 1.26.3`; point d’entrée réel `Code/main.go`, serveur HTTP `:8080` avec `http.NewServeMux`.
- Lance les commandes applicatives depuis `Code/`: `godotenv.Load()` charge `.env` depuis le cwd, et `/app/` sert `http.FileServer(http.Dir("."))` depuis le cwd.
- Variables attendues: `DB_URL`, `JWT_SECRET`, `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_API_VERSION`, `AZURE_EMBEDDING_MODEL`, `PLATFORM`; utiliser `Code/.env.example`, ne pas lire/copier `Code/.env`.
- OpenAI est configuré pour Azure via `openai-go/v3/azure` (`AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_API_VERSION`); ne pas basculer vers `OPENAI_API_KEY` sans demande explicite.
- Style Go local: utiliser `any` plutôt que `interface{}` dans le nouveau code.
- Auth: mots de passe Argon2id; JWT HS256 issuer `CAIJ-Machina-access`; les routes protégées utilisent `Authorization: Bearer <jwt>`, tandis que `/api/refresh` et `/api/revoke` attendent le refresh token en Bearer.
- Routes câblées dans `main.go`: auth/users/me, `GET|POST /api/clients`, KPI, documents, laws/law changes, alerts, `GET|PUT /api/keywords`, agent conversations, healthz, et `POST /admin/reset`.
- `PLATFORM=dev` active `POST /admin/reset` (suppression des `users`); hors dev la route répond `403`.

### Commandes backend vérifiées

```bash
cd Code
go mod download
go run .
go test ./...
go test ./internal/auth -run TestValidateJWT
go test . -run TestHealthz
```

- Santé: avec le serveur lancé, `curl http://localhost:8080/api/healthz` doit répondre `OK`.
- Les tests de chunking lisent `../documents/*.html` et `Code/contracts/*.html`; exécuter les tests depuis `Code/`.

## PostgreSQL, migrations et SQL généré

- Base attendue: PostgreSQL via `github.com/lib/pq` et `DB_URL`; les migrations Goose sont dans `Code/sql/schema/` et utilisent `gen_random_uuid()` (activer `pgcrypto` localement si nécessaire).
- Appliquer les migrations depuis `Code/` après avoir exporté une chaîne valide:

```bash
goose -dir sql/schema postgres "$DB_URL" up
```

- `scripts/db_bootstrap.sql` est un helper local qui crée un rôle/base `pdrago`; ne pas l’exécuter tel quel si l’utilisateur PostgreSQL local diffère.
- `Code/internal/database/` est généré par sqlc; modifier `Code/sql/schema/` ou `Code/sql/queries/`, puis régénérer depuis `Code/` avec `sqlc generate`.
- `Code/sqlc.yaml` force les tags JSON et masque `users.hashed_password` avec `json:"-"`.

## Frontend Next.js (`frontend/`)

- Next `16.2.6`, React `19.2.4`, TypeScript strict; routes App Router sous `frontend/src/app`, alias `@/*` vers `frontend/src/*`.
- `frontend/AGENTS.md` avertit que Next 16 a des changements cassants: lire le guide pertinent dans `frontend/node_modules/next/dist/docs/` avant de modifier du code Next.
- Tailwind v4 est configuré via `@tailwindcss/postcss` et les tokens `@theme` dans `src/app/globals.css`; il n’y a pas de `tailwind.config.*`.
- Client HTTP frontend: `src/lib/api.ts` utilise `NEXT_PUBLIC_API_URL` (défaut `http://localhost:8080`) et porte l’auth/refresh; les services sous `src/services/` appellent ce client et mappent les modèles Go vers l’UI.
- Pas de routes mock sous `src/app/api/`; tout passe par le backend Go via `src/lib/api.ts` sauf décision explicite de proxy/mock.

### Commandes frontend

```bash
cd frontend
npm ci
npm run dev
npm run lint
npm run build
```

- Aucun script de test frontend n’est configuré. `npm run lint` est configuré mais peut échouer sur des violations React hooks existantes; rerun avant d’annoncer un état vert.

## Fichiers à traiter avec prudence

- Secrets ignorés: `Code/.env` et `frontend/.env*`; ne pas les lire, copier ni committer.
- Artefacts ignorés: `Code/CAIJ-Machina`, `frontend/node_modules/`, `frontend/.next/`, `frontend/out/`, `frontend/build/`.

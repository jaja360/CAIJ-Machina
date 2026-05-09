# AGENTS.md

## Projet

- Prototype de hackathon BCF : veille juridique/réglementaire « juste à temps », à terme propulsée par IA/LLM; la description officielle est dans `Description_Défi_BCF.md`.
- Le backend Go existe dans `Code/`; aucun frontend React/JavaScript n’est encore configuré dans le dépôt.
- Les ressources OpenJustice fournies sont sous `Ressources Techniques - Technical Resources/OpenJustice/`; les scripts TypeScript y sont des exemples externes, pas une app frontend du repo.

## Backend Go (`Code/`)

- Module Go : `github.com/jaja360/CAIJ-Machina`, version `go 1.26.3` dans `Code/go.mod`.
- Point d’entrée réel : `Code/main.go`; serveur HTTP sur `:8080` avec `http.NewServeMux`.
- Style Go : utiliser `any` plutôt que `interface{}` dans le nouveau code.
- Toujours lancer les commandes applicatives depuis `Code/` : `godotenv.Load()` n’a pas de chemin explicite et charge donc `.env` depuis le répertoire courant.
- Variables attendues : `DB_URL`, `JWT_SECRET`, `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_API_VERSION`, `AZURE_EMBEDDING_MODEL`, `PLATFORM`; utiliser `Code/.env.example` comme modèle et ne jamais copier de secret depuis `Code/.env`.
- `apiConfig.openaiClient` est configuré avec `openai-go/v3/azure` depuis `AZURE_RESOURCE_NAME`, `AZURE_API_KEY` et `AZURE_API_VERSION`; ne pas revenir à `OPENAI_API_KEY` sans demande explicite.
- `PLATFORM=dev` active `POST /admin/reset`, qui vide la table `users`; hors `dev`, cette route répond `403`.
- `/app/` sert `http.FileServer(http.Dir("."))` depuis le répertoire courant; éviter d’y placer des fichiers sensibles servis par accident.

## Commandes vérifiées

```bash
cd Code
go mod download
go run .
go test ./...
go test ./internal/auth -run TestValidateJWT
```

- Santé backend : `curl http://localhost:8080/api/healthz` doit répondre `OK` quand le serveur tourne.
- Il n’y a pas de Makefile, CI, Dockerfile, config lint ou formatter repo-local; ne pas inventer de commandes npm tant qu’un frontend n’a pas été ajouté.

## Base de données et migrations

- Base attendue : PostgreSQL; `main.go` ouvre `os.Getenv("DB_URL")` avec le driver `github.com/lib/pq`.
- Les migrations Goose sont dans `Code/sql/schema/` et utilisent `gen_random_uuid()`; activer `pgcrypto` localement si nécessaire.
- Appliquer les migrations depuis `Code/` après avoir exporté une chaîne de connexion valide :

```bash
goose -dir sql/schema postgres "$DB_URL" up
```

## SQL généré

- `Code/internal/database/` est généré par sqlc; ne pas modifier ces fichiers à la main.
- Source sqlc : `Code/sqlc.yaml`, schémas `Code/sql/schema/`, requêtes `Code/sql/queries/`.
- Après modification du SQL, régénérer depuis `Code/` :

```bash
sqlc generate
```

- `sqlc.yaml` force les tags JSON et masque `users.hashed_password` avec `json:"-"`.

## API backend actuelle

- Routes câblées : `GET /api/healthz`, `POST /api/users`, `POST /api/login`, `PUT /api/users`, `POST /api/refresh`, `POST /api/revoke`, `POST /admin/reset`.
- Auth : mots de passe Argon2id, JWT HS256 avec issuer `CAIJ-Machina-access`, refresh tokens hex stockés en base.
- `PUT /api/users` attend un Bearer JWT; `/api/refresh` et `/api/revoke` attendent le refresh token en Bearer.

## Fichiers à traiter avec prudence

- `Code/.env` est ignoré par git et peut contenir des secrets locaux; ne pas le lire, le committer ou l’utiliser comme source de documentation.
- `Code/CAIJ-Machina` est un binaire ignoré par git; ne pas le modifier sauf si le workflow de build le nécessite explicitement.

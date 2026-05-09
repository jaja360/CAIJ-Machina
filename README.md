# Hackathon BCF — Information « juste à temps »

Prototype de veille juridique/réglementaire propulsée par l’IA. Le backend est développé en Go dans le dossier `Code/`.

## Lancer le backend Go

### Prérequis

- Go compatible avec la version déclarée dans `Code/go.mod` (`go 1.26.3`)
- PostgreSQL
- `goose` pour appliquer les migrations SQL

Installation de `goose` :

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

Assurez-vous que le dossier des binaires Go est dans votre `PATH` :

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

### 1. Installer les dépendances Go

Depuis la racine du dépôt :

```bash
cd Code
go mod download
```

### 2. Préparer la base de données PostgreSQL

Créer une base de données locale, par exemple :

```bash
createdb caij_machina
```

Si votre installation PostgreSQL ne fournit pas `gen_random_uuid()` par défaut, activez l’extension suivante :

```bash
psql caij_machina -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
```

### 3. Configurer les variables d’environnement

Créer un fichier `.env` dans le dossier `Code/` :

```bash
cp .env.example .env
```

S’il n’y a pas encore de `.env.example`, créez `Code/.env` manuellement avec ces variables :

```env
DB_URL=postgres://USER:PASSWORD@localhost:5432/caij_machina?sslmode=disable
JWT_SECRET=remplacer-par-un-secret-local
PLATFORM=dev
```

Remplacez `USER` et `PASSWORD` par vos identifiants PostgreSQL locaux. Si votre PostgreSQL local n’utilise pas de mot de passe, adaptez l’URL selon votre configuration.

### 4. Appliquer les migrations

Depuis le dossier `Code/`, exécuter :

```bash
goose -dir sql/schema postgres "postgres://USER:PASSWORD@localhost:5432/caij_machina?sslmode=disable" up
```

Utilisez la même chaîne de connexion que dans `DB_URL`.

### 5. Démarrer le serveur

Depuis le dossier `Code/` :

```bash
go run .
```

Le backend démarre sur le port `8080`.

Vérification rapide :

```bash
curl http://localhost:8080/api/healthz
```

Réponse attendue :

```text
OK
```

## Notes de développement

- Les variables d’environnement sont chargées automatiquement depuis `Code/.env` via `godotenv`.
- Les migrations SQL se trouvent dans `Code/sql/schema/`.
- Le code Go généré par `sqlc` se trouve dans `Code/internal/database/`.
- Si les requêtes SQL ou le schéma changent, installer `sqlc` puis régénérer le code :

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
cd Code
sqlc generate
```

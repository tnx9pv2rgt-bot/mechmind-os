---
globs:
  - "infrastructure/**/*"
  - "docker-compose*.yml"
  - "Dockerfile*"
---
# Infrastructure Rules

## Docker
- `docker-compose.yml` per sviluppo locale
- Backend: porta 3002, Frontend: porta 3000
- Services: postgres:15, redis:7

## CI/CD
- GitHub Actions in `.github/workflows/`
- Pipeline: lint -> typecheck -> test -> build -> deploy
- Mai committare secret nei workflow

## Comandi
```bash
docker compose up -d postgres redis  # Avvia DB e cache
cd backend && npm run start:dev      # Backend (porta 3002)
cd frontend && npm run dev           # Frontend (porta 3000)
```

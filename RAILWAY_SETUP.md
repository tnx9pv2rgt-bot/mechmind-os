# 🚀 Railway Auto-Deploy Setup

## Configurazione Completata ✓

### Files Creati:
- `.github/workflows/deploy.yml` - Deploy automatico a Railway
- `.github/workflows/ci.yml` - Build e test su ogni push

## Prossimi Passi (1 minuto):

### 1. Aggiungi il Secret su GitHub
Vai su: `https://github.com/tnx9pv2rgt-bot/mechmind-os/settings/secrets/actions`

Clicca **"New repository secret"**:
- **Name:** `RAILWAY_TOKEN`
- **Value:** `b5360488-7293-4158-852a-5f352150a758`

Clicca **Add secret**

### 2. Configura Auto-Deploy su Railway (Opzionale)
Railway Dashboard → mechmind-backend → Settings → GitHub:
- ✓ Enable "Auto-deploy on push"
- Branch: `main`

> **Nota:** Se GitHub Actions è configurato, questo è ridondante ma doppia sicurezza.

### 3. Testa il Deploy
```bash
git add .
git commit -m "chore: setup auto-deploy to Railway via GitHub Actions"
git push origin main
```

Vai su: `https://github.com/tnx9pv2rgt-bot/mechmind-os/actions` per vedere il deploy in corso!

---

## Come Funziona:

| Evento | Azione |
|--------|--------|
| Push su `main` | Trigger GitHub Actions |
| CI Build | Build backend + frontend per verificare errori |
| Deploy | Railway CLI deploya mechmind-backend |
| Vercel (frontend) | Auto-deploy separato (già configurato) |

## Troubleshooting:

**Deploy fallito?**
1. Controlla i log: GitHub → Actions → workflow fallito
2. Verifica il token sia corretto nei Secrets
3. Assicurati il service name sia `mechmind-backend` su Railway

**Build fallito?**
- Il workflow CI verifica build prima del deploy
- Fixa gli errori TypeScript prima di pushare

---

## Token Railway:
```
b5360488-7293-4158-852a-5f352150a758
```
⚠️ **Non condividere questo token!** È già nel file `.kimi/.env` (non tracciato da git).

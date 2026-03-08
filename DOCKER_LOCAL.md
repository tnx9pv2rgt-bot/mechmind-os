# 🐳 MechMind OS - Sviluppo Locale con Docker

**Versione completamente GRATUITA** - Nessun costo, tutto in locale!

---

## 📋 Requisiti

- **Docker** (gratis): https://docs.docker.com/get-docker/
- **Docker Compose** (incluso in Docker Desktop)
- **Git** (per clonare il repo)

---

## 🚀 Avvio Rapido

```bash
# 1. Entra nella cartella del progetto
cd mechmind-os

# 2. Avvia tutto con uno script
./start-local.sh
```

**Fatto!** L'app è disponibile su http://localhost:3001

---

## 🌐 Servizi Disponibili

| Servizio | URL | Descrizione |
|----------|-----|-------------|
| Frontend | http://localhost:3001 | UI Next.js |
| Backend API | http://localhost:3000 | API NestJS |
| Database UI | http://localhost:8080 | Adminer (PostgreSQL) |
| Redis UI | http://localhost:8081 | Redis Commander |

---

## 🛠️ Comandi Utili

```bash
# Avvia tutto
docker-compose up -d

# Avvia in modalità sviluppo (con rebuild)
docker-compose up --build

# Vedi log in tempo reale
docker-compose logs -f

# Vedi log solo del backend
docker-compose logs -f backend

# Entra nel container backend
docker-compose exec backend sh

# Ferma tutto
docker-compose down

# Ferma e cancella dati (ATTENZIONE: perde DB!)
docker-compose down -v

# Ricostruisci senza cache
docker-compose build --no-cache
```

---

## 📁 Struttura Docker

```
mechmind-os/
├── docker-compose.yml      # Configurazione tutti servizi
├── start-local.sh          # Script avvio automatico
├── backend/
│   └── Dockerfile.local    # Configurazione backend
├── frontend/
│   └── Dockerfile.local    # Configurazione frontend
└── DOCKER_LOCAL.md         # Questo file
```

---

## 💾 Database Persistente

I dati vengono salvati in volumi Docker:
- `postgres_data`: Database PostgreSQL
- `redis_data`: Cache Redis

**I dati persistono anche se riavvii i container!**

---

## 🔧 Configurazione Variabili

Modifica `docker-compose.yml` per cambiare:

```yaml
environment:
  JWT_SECRET: "tua-chiave-segreta"
  NEXT_PUBLIC_API_URL: "http://localhost:3000"
```

---

## 🐛 Troubleshooting

### Problema: Porta già in uso
```bash
# Trova cosa usa la porta 3000
lsof -ti:3000

# Oppure cambia porta in docker-compose.yml
ports:
  - "3002:3000"  # Usa porta 3002 invece di 3000
```

### Problema: Permessi su Linux/Mac
```bash
chmod +x start-local.sh
./start-local.sh
```

### Problema: Container non si avvia
```bash
# Vedi errori dettagliati
docker-compose logs backend
docker-compose logs frontend
```

### Problema: Database non connette
```bash
# Verifica postgres sia healthy
docker-compose ps

# Riavvia solo postgres
docker-compose restart postgres
```

---

## 🔄 Workflow Sviluppo

1. **Modifiche al codice**: Sono rilevate automaticamente (hot reload)
2. **Installare nuovi pacchetti**: 
   ```bash
   docker-compose exec backend npm install pacchetto
   docker-compose exec frontend npm install pacchetto
   ```
3. **Migrazioni database**:
   ```bash
   docker-compose exec backend npx prisma migrate dev
   ```
4. **Generare Prisma client**:
   ```bash
   docker-compose exec backend npx prisma generate
   ```

---

## 🧹 Pulizia Completa

```bash
# Ferma tutto e rimuovi volumi (PERDE DATI!)
docker-compose down -v

# Rimuovi immagini non usate
docker system prune -a

# Ricomincia da zero
./start-local.sh
```

---

## 🌟 Vantaggi vs Railway/Render

| Caratteristica | Docker Locale | Railway/Render |
|----------------|---------------|----------------|
| **Costo** | 💚 Gratis | 💰 $5-20/mese |
| **Internet** | Non serve | Richiesto |
| **Velocità** | ⚡ Istantanea | 🐢 Dipende da rete |
| **Privacy** | 🔒 Dati locali | ☁️ Su cloud |
| **Condivisione** | ❌ Solo tu | ✅ Team access |

---

## 🎯 Quando passare al cloud?

**Rimani in locale se:**
- Stai sviluppando/sperimentando
- Non hai budget
- Lavori da solo

**Passa al cloud quando:**
- Vuoi mostrare l'app ad altri (cliente, team)
- Serve accesso da internet
- Vai in produzione

---

## 📞 Supporto

Problemi? Controlla i log:
```bash
docker-compose logs --tail=100
```

**Questa configurazione è gratuita e funziona per sempre in locale!** 🎉

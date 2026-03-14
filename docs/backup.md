# Database Backup & Restore

## Render (Produzione)

Render offre backup automatici per i database PostgreSQL a pagamento.
Per il piano free tier, usare lo script manuale.

### Backup manuale da Render

```bash
# Esporta il DB da Render (usa l'URL dal dashboard)
DATABASE_URL="postgresql://..." ./scripts/backup-db.sh manual
```

## Self-Hosted / Docker

### Backup manuale

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mechmind" \
  ./scripts/backup-db.sh manual
```

### Backup automatico giornaliero (cron)

```bash
# Aggiungi al crontab (crontab -e):
0 2 * * * cd /path/to/mechmind && DATABASE_URL="postgresql://..." ./scripts/backup-db.sh daily
```

Il backup giornaliero:
- Si esegue alle 02:00
- Comprime con gzip (compressione livello 9)
- Elimina automaticamente i backup più vecchi di 30 giorni
- Salva in `./backups/` (configurabile con `BACKUP_DIR`)

### Restore

```bash
DATABASE_URL="postgresql://..." ./scripts/restore-db.sh backups/mechmind_daily_20260312_020000.sql.gz
```

Il restore:
- Chiede conferma prima di procedere
- Sovrascrive il database corrente
- Esegue `prisma migrate deploy` dopo il restore per allineare lo schema

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `DATABASE_URL` | (obbligatorio) | Connection string PostgreSQL |
| `BACKUP_DIR` | `./backups` | Directory dove salvare i backup |
| `BACKUP_RETENTION_DAYS` | `30` | Giorni di retention per backup giornalieri |

## Struttura file

```
backups/
├── mechmind_daily_20260312_020000.sql.gz
├── mechmind_daily_20260311_020000.sql.gz
└── mechmind_manual_20260310_153000.sql.gz
```

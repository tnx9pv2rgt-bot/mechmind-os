# Database Schema - Sistema Registrazione Clienti

Questo folder contiene lo schema completo del database PostgreSQL per il sistema di registrazione clienti.

## 📁 Struttura

```
database/
├── schema.sql              # Schema completo (tutto in un file)
├── README.md               # Questo file
└── migrations/             # Migrazioni ordinate
    ├── 001_create_customers.sql
    ├── 002_create_tokens.sql
    ├── 003_create_vat_cache.sql
    ├── 004_create_audit_log.sql
    ├── 005_create_rate_limits.sql
    ├── 006_add_indexes.sql
    ├── 007_add_functions.sql
    └── 008_seed_data.sql
```

## 🗄️ Tabelle

### customers
Tabella principale dei clienti registrati. Supporta sia clienti privati che business.

**Campi principali:**
- `customer_type`: ENUM ('private', 'business')
- `status`: ENUM ('pending_email_verification', 'active', 'suspended')
- `email_verified`: BOOLEAN
- `vat_verified`: BOOLEAN (solo business)
- Consensi GDPR con timestamp

### email_verification_tokens
Token per la verifica dell'email dei nuovi utenti.

### vat_verifications
Cache delle verifiche Partita IVA (es. VIES API) con scadenza.

### signup_audit_log
Log di audit per compliance GDPR. Traccia eventi significativi.

### rate_limits
Rate limiting per protezione contro brute force.

## 🔧 Come Usare

### Schema Completo (sviluppo)
```bash
# Creare il database
psql -U postgres -c "CREATE DATABASE customer_registration;"

# Eseguire lo schema completo
psql -U postgres -d customer_registration -f backend/database/schema.sql
```

### Migrazioni (produzione)
```bash
# Eseguire le migrazioni in ordine
for file in backend/database/migrations/*.sql; do
    psql -U postgres -d customer_registration -f "$file"
done
```

## 🔍 Funzioni Utility

### `is_email_token_valid(token)`
Verifica se un token di verifica email è valido.

```sql
SELECT * FROM is_email_token_valid('your-token-here');
```

### `cleanup_expired_tokens()`
Pulisce i token scaduti (più vecchi di 7 giorni).

```sql
SELECT cleanup_expired_tokens();
```

### `cleanup_expired_rate_limits()`
Pulisce i rate limits scaduti.

```sql
SELECT cleanup_expired_rate_limits();
```

### `get_customer_stats()`
Restituisce statistiche sui clienti.

```sql
SELECT * FROM get_customer_stats();
```

## 📊 Indici

- `idx_customers_email` - Ricerca per email
- `idx_customers_vat_number` - Ricerca per P.IVA
- `idx_tokens_token` - Validazione token
- `idx_audit_customer_id` - Query audit per cliente
- `idx_rate_limits_unique` - Rate limiting efficace

## ✅ Vincoli di Validazione

1. **chk_customer_type**: Se privato richiede nome/cognome, se business richiede ragione sociale
2. **chk_gdpr**: Se GDPR accettato, richiede timestamp
3. **chk_privacy**: Se privacy accettata, richiede timestamp
4. **chk_status**: Stato pending richiede email non verificata

## 🌱 Seed Data

Include dati di test per 6 clienti:
- 3 privati (attivo, pending, suspended)
- 3 business (2 attivi, 1 pending)

Password di test: `TestPassword123!`

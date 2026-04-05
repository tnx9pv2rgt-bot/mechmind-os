# Risultati Verifica UX Audit

**Data verifica:** 2026-04-04
**Metodo:** Test con credenziali reali (seed admin + customer portale), curl su backend:3002 + frontend:3000
**Credenziali:** `admin@demo.mechmind.it` / `Demo2026!` (tenant: demo) + `mario.bianchi@gmail.com` / `Demo2026!` (portale)

---

## Verdetti

| # | Finding | Verdetto | Evidenza |
|---|---------|----------|----------|
| 1 | PII criptati nelle risposte booking | **CONFERMATO** | `GET /v1/bookings` → `customer.encryptedFirstName: "bc087a..."`, `encryptedEmail: "6868fc..."`. I PII del customer incluso nel booking non vengono decriptati. Nota: `GET /v1/customers` restituisce i dati in chiaro correttamente. |
| 2 | Fatture con items vuoti | **CONFERMATO** | `GET /v1/work-orders` → `laborItems: [[]]`, `partsUsed: [[]]`. `GET /v1/invoices` → `items: []` con `subtotal: "41"`. Il totale e' calcolato ma gli items non vengono persistiti. |
| 3 | Pagina login /login 404 | **FALSO POSITIVO** | `/login` restituisce 404, ma `/auth` restituisce 200. La pagina login esiste in `frontend/app/auth/page.tsx`. L'audit ha testato il path sbagliato. |
| 4 | Change password endpoint mancante | **CONFERMATO** | Testati: `/v1/auth/change-password`, `update-password`, `password`, `reset-password`, `forgot-password` — tutti 404. Nessun endpoint per cambio password da utente autenticato esiste nel codice. |
| 5 | Portal invoices listing 404 | **CONFERMATO** | `GET /v1/portal/invoices` → 404. Esiste solo `GET /v1/portal/invoices/:id` (dettaglio singolo). Il cliente non puo' vedere la lista delle sue fatture. |
| 6 | Video demo vuoto | **CONFERMATO** | `video-modal.tsx` contiene `{/* Video placeholder */}` con un `div.aspect-video` vuoto. Zero iframe, zero embed, zero sorgente video. Il pulsante "Guarda il video (90s)" apre un modal vuoto. |
| 7 | Zero testimonianze reali | **CONFERMATO** | `testimonials.tsx` contiene 3 "reason cards" generiche ("Setup in 2 minuti", "100% Italia", "I tuoi dati sono tuoi"). Nessun nome, ruolo, foto, citazione di cliente reale. Il componente si chiama Testimonials ma non contiene testimonianze. |
| 8 | Dashboard wireframe CSS | **PARZIALE** | Non e' un wireframe grezzo — e' un mock CSS sofisticato con KPI credibili (Fatturato 42.580, OdL 23, Prenotazioni 18), grafico a barre animato, tabella con dati fittizi. Non e' uno screenshot reale ma e' marketing accettabile. Meno grave di quanto descritto. |
| 9 | Filtri non funzionanti | **CONFERMATO** | `GET /v1/customers` → 12 risultati. `GET /v1/customers?search=Mario` → 12 risultati. `GET /v1/customers?search=zzzzxxx` → 12 risultati. Il parametro `search` viene completamente ignorato. |
| 10 | Conflitto dominio .it/.com | **CONFERMATO** | `layout.tsx`: `metadataBase: 'https://mechmind.com'`, `dns-prefetch: 'api.mechmind.com'`. `page.tsx`: `canonical: 'https://mechmind.it'`. `register/page.tsx`: `mechmind.it/{slug}`. `portal/layout.tsx`: `supporto@mechmind.it`. SEO confuso, canonical contraddittorio. |

---

## Riepilogo

| Categoria | Conteggio |
|-----------|-----------|
| **Confermati** | 7/10 |
| **Falsi positivi** | 1/10 |
| **Parziali** | 1/10 |
| **Non verificabili** | 0/10 |

### Per gravita'

**CRITICI (bloccano l'uso):**
1. **#1 PII criptati nei booking** — il titolare vede hash invece di nomi clienti
2. **#2 Fatture items vuoti** — fatture con totale ma senza dettaglio voci
3. **#4 Nessun cambio password** — funzionalita' di sicurezza base mancante
4. **#9 Filtri rotti** — con 12+ clienti, impossibile cercare

**SERI (degradano l'esperienza):**
5. **#5 Portal invoices listing** — il cliente non puo' vedere le sue fatture
6. **#6 Video demo vuoto** — CTA "Guarda il video" apre modal vuoto
7. **#7 Testimonianze assenti** — sezione marketing senza social proof reale
8. **#10 Dominio .it/.com** — SEO e branding inconsistenti

**MINORI:**
9. **#8 Dashboard mock** — accettabile per landing page marketing

**FALSO POSITIVO:**
10. **#3 Login /login** — esiste a `/auth`, path diverso ma funziona

---

## Score UX corretto

L'audit originale dava 3.7/10. Con la verifica:

- 7 finding su 10 confermati (70% di accuratezza dell'audit)
- 1 falso positivo (login esiste, path diverso)
- 1 parziale (dashboard mock e' accettabile)

**Score backend API:** 5/10 — funzionalita' core presenti ma con bug seri (PII, items, filtri)
**Score frontend landing:** 4/10 — struttura buona ma contenuti placeholder ovunque
**Score portale clienti:** 3/10 — manca listing fatture, funzionalita' base assenti

**Score complessivo rivisto: 4.5/10** (leggermente meglio del 3.7 originale, il login funziona e la dashboard mock e' accettabile)

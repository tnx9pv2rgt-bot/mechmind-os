# AI System Card — MechMind OS

**Data:** 2026-05-14 **Regolamento:** EU AI Act (Reg. 2024/1689)
**Classificazione:** Limited Risk (Annex III non applicabile)

## Sistemi AI Presenti

### 1. AI Diagnostic

- **Funzione:** Analisi codici DTC e sintomi veicolo per suggerire diagnosi
- **Input:** Codici errore OBD, descrizione sintomi testuale
- **Output:** Diagnosi probabile, parti consigliate, stima costo
- **Provider:** Anthropic Claude / OpenAI GPT (configurabile)
- **Autonomia:** SUGGESTIVO — decisione finale spetta al tecnico umano
- **Limitazioni:** Non effettua diagnosi mediche. Accuracy ~85% su codici DTC
  comuni.

### 2. Voice AI

- **Funzione:** Gestione chiamate in entrata, prenotazioni via voce
- **Input:** Audio chiamata telefonica
- **Output:** Testo trascritto, azione eseguita (prenotazione, info)
- **Provider:** Vapi (ElevenLabs + Deepgram + Groq)
- **Autonomia:** Crea prenotazioni automaticamente; il cliente può sempre
  parlare con operatore

### 3. AI Scheduling

- **Funzione:** Ottimizzazione calendario prenotazioni
- **Input:** Disponibilità tecnici, storico prenotazioni, carico di lavoro
- **Output:** Suggerimento slot ottimale
- **Autonomia:** SUGGESTIVO — operatore conferma manualmente

## Trasparenza verso i Clienti

I clienti finali (automobilisti) che interagiscono con Voice AI sono informati
che:

1. La chiamata può essere gestita da un sistema AI
2. Possono richiedere in qualsiasi momento di parlare con un operatore umano
3. Le decisioni di diagnosi non sono vincolanti — richiedono conferma di un
   tecnico

## Bias e Limitazioni Note

- AI Diagnostic addestrato principalmente su veicoli europei (copertura
  inferiore per veicoli asiatici pre-2010)
- Voice AI può avere difficoltà con accenti regionali forti
- Non adatto per veicoli d'emergenza o uso safety-critical

## Conformità

- [x] Disclosure "sistema AI" visibile nell'interfaccia
- [x] Override umano sempre disponibile
- [x] Log decisioni AI per audit (AiDecisionLog table)
- [x] Opt-out possibile (flag `consentAI` nel profilo tenant)
- [ ] Registrazione EUAI Register (da completare se classificazione cambia)

## Contatto

Per domande sul sistema AI: dpo@mechmind.it

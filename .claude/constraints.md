# Vincoli Tecnici

paths: "backend/src/**"
Mac mini 8GB: max 4 processi pesanti paralleli (agent, jest, build). Tool leggeri (Read, Grep) senza limiti.
Token: non ri-leggere file già in contesto. Bash sempre con grep/head/tail per limitare output.

# Nexo Internationalization Formatting Guide

Date, number, and currency formatting for all 26 EU/EFTA languages.

## Overview

Different regions use different formatting conventions. This guide ensures consistent, locale-appropriate display across all Nexo languages.

## Date Formats

### DD/MM/YYYY (Most EU Countries)
Used by: bg, el, en, es, fr, ga, mt, nl, pt, ro

```javascript
// Examples
'en': '24/12/2024'    // Christmas Eve
'fr': '14/07/2024'    // Bastille Day
'es': '12/10/2024'    // Hispanic Day
```

### DD.MM.YYYY (Central/Northern Europe)
Used by: de, et, fi, hu, lt, lv, pl, sk, sl

```javascript
// Examples
'det': '03.10.2024'   // German Unity Day
'pl': '11.11.2024'    // Polish Independence Day
```

### YYYY-MM-DD (ISO Style)
Used by: sv, da, cs

```javascript
// Examples
'sv': '2024-06-06'    // Swedish National Day
'dn': '2024-06-05'    // Danish Constitution Day
```

## Time Formats

### 24-Hour Format (All EU/EFTA)
All supported languages use 24-hour format.

```javascript
// Standard format: HH:mm
'14:30'  // 2:30 PM
'09:15'  // 9:15 AM
```

## Number Formats

### Comma Decimal (Most EU)
Used by: bg, cs, da, de, el, es, et, fi, fr, hu, it, lt, lv, nl, pl, pt, ro, sk, sl, sv

```javascript
// 1.234,56
'det': '1.234,56'
'fr': '1 234,56'   // Space as thousands separator
```

### Dot Decimal (UK/Ireland)
Used by: en, ga, mt

```javascript
// 1,234.56
'en': '1,234.56'
```

## Currency Formats

### Euro (€) - Most Countries

**Prefix:** de, en, ga - `€100,00`
**Suffix with space:** fr, es, it - `100,00 €`

### Local Currencies

| Country | Currency | Format |
|---------|----------|--------|
| Bulgaria | BGN | 100,00 лв. |
| Czech | CZK | 100,00 Kč |
| Denmark | DKK | 100,00 kr. |
| Hungary | HUF | 100 Ft |
| Norway | NOK | kr 100,00 |
| Poland | PLN | 100,00 zł |
| Romania | RON | 100,00 lei |
| Sweden | SEK | 100,00 kr |
| Switzerland | CHF | CHF 100.00 |

## First Day of Week

All EU/EFTA countries use **Monday** as the first day of the week.

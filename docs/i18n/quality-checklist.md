# i18n Quality Checklist

Pre-release checklist for new language translations.

## Files Check

- [ ] All 7 translation files exist:
  - [ ] common.json
  - [ ] auth.json
  - [ ] customers.json
  - [ ] vehicles.json
  - [ ] booking.json
  - [ ] shop.json
  - [ ] analytics.json

## JSON Structure

- [ ] Valid JSON syntax (no trailing commas)
- [ ] All keys match English reference
- [ ] No missing nested keys
- [ ] Consistent indentation (2 spaces)
- [ ] UTF-8 encoding

## Content Quality

- [ ] All strings translated (no English remaining)
- [ ] Placeholders preserved: `{{variable}}`
- [ ] No HTML in translations
- [ ] No JavaScript in translations
- [ ] Special characters display correctly
- [ ] Gender-appropriate translations where applicable

## UI Testing

- [ ] Navigation items fit in menu
- [ ] Buttons don't overflow
- [ ] Forms display correctly
- [ ] Error messages are clear
- [ ] Notifications are readable
- [ ] Tables align properly

## Formatting

- [ ] Dates display in correct format
- [ ] Numbers use correct separators
- [ ] Currency symbol in correct position
- [ ] Time format is 24-hour
- [ ] First day of week is Monday

## Functionality

- [ ] Language switches correctly
- [ ] Language persists after refresh
- [ ] URL updates with language prefix
- [ ] SEO meta tags update
- [ ] Date picker uses correct locale

## Accessibility

- [ ] Screen readers announce language change
- [ ] Font supports all characters
- [ ] Text remains readable at all sizes
- [ ] No text overflow in responsive views

## Final Review

- [ ] Native speaker review completed
- [ ] Automotive terminology verified
- [ ] Legal/compliance text approved
- [ ] All tests passing

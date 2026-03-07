# MechMind Customer Self-Service Portal

A complete customer self-service portal for MechMind OS, allowing customers to manage their vehicles, bookings, inspections, documents, and more.

## Features

### Authentication
- Customer registration and login
- JWT-based authentication with 30-day expiration
- Password reset functionality
- GDPR-compliant consent management

### Dashboard
- Welcome message with customer name
- Next upcoming booking display
- Maintenance due alerts
- Recent inspection score
- Warranty status overview
- Quick actions (book appointment, view documents, contact support)

### Bookings
- List all bookings (past and upcoming)
- Create new bookings with:
  - Date picker (calendar)
  - Time slot selector
  - Service type selection
  - Vehicle selection
  - Notes
- Cancel/reschedule upcoming bookings
- Status badges (confirmed, completed, cancelled)

### Inspections
- List all vehicle inspections
- View inspection scores (0-10)
- Download PDF reports
- View inspection photos
- Share reports

### Documents
- Tabs: Invoices | Maintenance Records | Inspection Reports
- Search by document number or title
- Download documents
- Filter by document type

### Maintenance
- Maintenance schedule tracking
- Due date alerts
- Priority indicators (low, medium, high, critical)
- Direct booking from maintenance items

### Warranty
- Warranty status overview
- Active/expired/expiring soon indicators
- Claim history
- Mileage tracking

### Settings
- Profile management (name, phone, email)
- Password change
- Notification preferences:
  - Email toggles
  - SMS toggles
  - WhatsApp toggles
  - Push notifications
- Two-factor authentication setup
- Account deletion (GDPR)

## File Structure

```
app/portal/
├── layout.tsx              # Portal layout with auth check
├── page.tsx                # Redirect to dashboard
├── globals.css             # Portal-specific styles
├── login/page.tsx          # Login page
├── register/page.tsx       # Registration page
├── dashboard/page.tsx      # Main dashboard
├── bookings/
│   ├── page.tsx            # List bookings
│   └── new/page.tsx        # Create booking
├── inspections/page.tsx    # View inspections
├── documents/page.tsx      # View documents
├── maintenance/page.tsx    # Maintenance schedule
├── warranty/page.tsx       # Warranty status
└── settings/page.tsx       # Profile & preferences

components/portal/
├── index.ts                # Component exports
├── PortalLayout.tsx        # Sidebar navigation layout
├── PortalHeader.tsx        # Mobile header with menu
├── BookingCard.tsx         # Booking display card
├── InspectionCard.tsx      # Inspection summary card
├── DocumentCard.tsx        # Document with download
├── MaintenanceItem.tsx     # Maintenance due item
└── WarrantySummary.tsx     # Warranty status card

lib/auth/
├── portal-auth.ts          # PortalAuthService class

lib/types/
├── portal.ts               # TypeScript types for portal

middleware/
├── portal-auth.ts          # Portal authentication middleware

app/api/portal/
├── auth/login/route.ts     # Login API
├── auth/register/route.ts  # Registration API
├── dashboard/route.ts      # Dashboard data API
├── bookings/route.ts       # Bookings CRUD API
├── inspections/route.ts    # Inspections API
├── documents/route.ts      # Documents API
├── profile/route.ts        # Profile API
└── preferences/route.ts    # Notification preferences API
```

## Security Features

- JWT tokens with 30-day expiration
- All portal routes protected by authentication
- Data isolation - customers can only access their own data
- CSRF protection on forms
- Password requirements (min 8 characters)
- Secure cookie handling (httpOnly, secure, sameSite)

## Mobile Responsive

- Responsive design down to 375px width
- Touch-friendly buttons (min 44px)
- Bottom navigation on mobile
- Collapsible sidebar
- Safe area support for notched devices

## Testing Checklist

- [ ] Login/logout flow
- [ ] Registration with validation
- [ ] Dashboard loads with correct data
- [ ] Bookings list and creation
- [ ] Inspections view and PDF download
- [ ] Documents filter and download
- [ ] Maintenance alerts
- [ ] Warranty status display
- [ ] Settings save
- [ ] Mobile responsiveness (375px, 768px, 1024px+)
- [ ] Data isolation (try accessing other customer data)

## Environment Variables

```env
# Portal JWT Secret (change in production)
PORTAL_JWT_SECRET=your-secret-key-here

# API Base URL
NEXT_PUBLIC_API_URL=/api/portal
```

## Usage

1. Navigate to `/portal` to access the login page
2. Use demo credentials: `demo@mechmind.com` / `password123`
3. Or register a new account at `/portal/register`

## Future Enhancements

- Real-time notifications via WebSocket
- Two-factor authentication (TOTP)
- Push notifications
- Mobile app (PWA)
- Multi-language support
- Dark mode

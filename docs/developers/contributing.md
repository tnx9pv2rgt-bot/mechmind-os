# Contributing Guidelines

Thank you for your interest in contributing to MechMind OS! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Respect different viewpoints and experiences

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following our guidelines
5. **Submit a pull request**

## Development Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/voice-booking` |
| Bug Fix | `fix/issue-description` | `fix/booking-race-condition` |
| Hotfix | `hotfix/critical-issue` | `hotfix/security-patch` |
| Documentation | `docs/description` | `docs/api-examples` |

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/process changes

Examples:

```
feat(booking): add advisory lock for slot reservation

Implement PostgreSQL advisory locks to prevent double-booking
during voice conversations. Lock expires after 5 minutes.

Fixes #123
```

```
fix(api): resolve race condition in booking creation

Add transaction isolation to prevent concurrent bookings
of the same slot.

Closes #456
```

## Code Standards

### Go

```go
// Follow standard Go conventions
// Use gofmt, golint, go vet

// Package documentation
// Package booking provides booking management functionality.
package booking

// Interface naming
type BookingRepository interface {
    Create(booking *Booking) error
    GetByID(id string) (*Booking, error)
}

// Error handling
if err != nil {
    return fmt.Errorf("failed to create booking: %w", err)
}

// Context propagation
func (s *Service) Process(ctx context.Context, id string) error {
    // Always accept context as first parameter
}
```

### Python

```python
"""Voice service webhook handlers."""

from typing import Optional
from datetime import datetime

# Type hints
def handle_booking_intent(
    event: dict,
    db: DatabaseConnection
) -> dict:
    """Handle booking intent from voice conversation.
    
    Args:
        event: Webhook event payload
        db: Database connection
        
    Returns:
        Response with reservation details
    """
    # Docstrings for all public functions
    pass

# Exception handling
try:
    result = await process_booking(data)
except BookingError as e:
    logger.error("Booking failed: %s", e)
    raise
```

### TypeScript/React

```typescript
// Component with proper types
interface BookingFormProps {
  onSubmit: (data: BookingData) => Promise<void>;
  initialData?: Partial<BookingData>;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onSubmit,
  initialData
}) => {
  // Component implementation
};

// Hook naming
const useBookings = (filters: BookingFilters) => {
  // Custom hook
};
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass

## Related Issues
Fixes #123
```

### Review Process

1. **Automated checks** must pass:
   - CI/CD pipeline
   - Code coverage thresholds
   - Linting
   - Security scans

2. **Code review** by at least one maintainer:
   - Code quality
   - Test coverage
   - Documentation
   - Security considerations

3. **Approval and merge**:
   - Squash merge to main
   - Delete feature branch

## Testing Requirements

### Unit Tests

All new code must include unit tests:

```go
// Test happy path and error cases
func TestService_CreateBooking(t *testing.T) {
    tests := []struct {
        name    string
        input   *Booking
        wantErr bool
    }{
        {"valid booking", validBooking, false},
        {"missing customer", noCustomerBooking, true},
        {"invalid slot", invalidSlotBooking, true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := service.CreateBooking(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Integration Tests

Critical paths require integration tests:

- Booking creation flow
- Voice webhook handling
- Payment processing
- Database transactions

## Documentation

### Code Documentation

```go
// BookingService manages appointment bookings.
type BookingService struct {
    repo BookingRepository
    lock LockManager
}

// CreateBooking creates a new booking with slot reservation.
// Returns ErrSlotUnavailable if the slot is already booked.
// Returns ErrInvalidInput if required fields are missing.
func (s *BookingService) CreateBooking(ctx context.Context, req *CreateBookingRequest) (*Booking, error) {
    // Implementation
}
```

### API Documentation

Update OpenAPI spec for API changes:

```yaml
# docs/api/openapi.yaml
/v1/bookings:
  post:
    summary: Create booking
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateBookingRequest'
    responses:
      '201':
        description: Booking created
      '409':
        description: Slot unavailable
```

## Database Changes

### Migration Guidelines

1. **Always provide down migration**
2. **Test migrations on copy of production data**
3. **Avoid destructive changes in same release as code**
4. **Document breaking changes**

```sql
-- migrations/000123_add_booking_notes.up.sql
-- Add notes column to bookings table
-- Breaking: None
-- Performance: Instant (nullable column)

ALTER TABLE bookings ADD COLUMN notes TEXT;

-- migrations/000123_add_booking_notes.down.sql
ALTER TABLE bookings DROP COLUMN notes;
```

## Security

### Security Checklist

- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Proper authentication/authorization
- [ ] Audit logging for sensitive operations

### Reporting Security Issues

Email security issues to: security@mechmind.io

Do NOT create public issues for security vulnerabilities.

## Release Process

### Version Numbering

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Tag created
- [ ] Release notes published

## Getting Help

- **Documentation**: https://docs.mechmind.io
- **Slack**: #dev-help channel
- **Issues**: GitHub Issues
- **Email**: dev@mechmind.io

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Invited to contributor events

Thank you for contributing to MechMind OS!

import * as fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import { validateTransition, TransitionMap } from '../utils/state-machine';

// Mirrors the booking transitions defined in booking.service.ts
const BOOKING_TRANSITIONS: TransitionMap = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

// Mirrors the invoice transitions defined in invoice.service.ts
const INVOICE_TRANSITIONS: TransitionMap = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const BOOKING_STATUSES = Object.keys(BOOKING_TRANSITIONS) as string[];
const INVOICE_STATUSES = Object.keys(INVOICE_TRANSITIONS) as string[];

describe('validateTransition — property-based tests (fast-check)', () => {
  describe('booking state machine', () => {
    it('always accepts valid transitions without throwing', () => {
      // For every state with at least one valid next state, pick a valid target
      // eslint-disable-next-line security/detect-object-injection
      const statesWithTransitions = BOOKING_STATUSES.filter(s => BOOKING_TRANSITIONS[s].length > 0);

      fc.assert(
        fc.property(fc.constantFrom(...statesWithTransitions), fromStatus => {
          // eslint-disable-next-line security/detect-object-injection
          const validTargets = BOOKING_TRANSITIONS[fromStatus];
          const toStatus = validTargets[0]; // Always valid
          expect(() =>
            validateTransition(fromStatus, toStatus, BOOKING_TRANSITIONS, 'booking'),
          ).not.toThrow();
          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('always throws BadRequestException for invalid transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...BOOKING_STATUSES),
          fc.constantFrom(...BOOKING_STATUSES),
          (fromStatus, toStatus) => {
            // eslint-disable-next-line security/detect-object-injection
            const allowed = BOOKING_TRANSITIONS[fromStatus] ?? [];
            fc.pre(!allowed.includes(toStatus)); // Only test INVALID combinations

            expect(() =>
              validateTransition(fromStatus, toStatus, BOOKING_TRANSITIONS, 'booking'),
            ).toThrow(BadRequestException);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('terminal states reject ALL transitions to any status', () => {
      // eslint-disable-next-line security/detect-object-injection
      const terminalStates = BOOKING_STATUSES.filter(s => BOOKING_TRANSITIONS[s].length === 0);

      fc.assert(
        fc.property(
          fc.constantFrom(...terminalStates),
          fc.constantFrom(...BOOKING_STATUSES),
          (fromStatus, toStatus) => {
            expect(() =>
              validateTransition(fromStatus, toStatus, BOOKING_TRANSITIONS, 'booking'),
            ).toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('error message always contains current and requested status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...BOOKING_STATUSES),
          fc.constantFrom(...BOOKING_STATUSES),
          (fromStatus, toStatus) => {
            // eslint-disable-next-line security/detect-object-injection
            const allowed = BOOKING_TRANSITIONS[fromStatus] ?? [];
            fc.pre(!allowed.includes(toStatus));

            try {
              validateTransition(fromStatus, toStatus, BOOKING_TRANSITIONS, 'booking');
              return false; // Should have thrown
            } catch (err) {
              const message = (err as BadRequestException).message;
              expect(message).toContain(fromStatus);
              expect(message).toContain(toStatus);
              return true;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('invoice state machine', () => {
    it('always accepts valid invoice transitions', () => {
      // eslint-disable-next-line security/detect-object-injection
      const statesWithTransitions = INVOICE_STATUSES.filter(s => INVOICE_TRANSITIONS[s].length > 0);

      fc.assert(
        fc.property(fc.constantFrom(...statesWithTransitions), fromStatus => {
          // eslint-disable-next-line security/detect-object-injection
          const validTargets = INVOICE_TRANSITIONS[fromStatus];
          expect(() =>
            validateTransition(fromStatus, validTargets[0], INVOICE_TRANSITIONS, 'invoice'),
          ).not.toThrow();
          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('invoice terminal states (PAID, CANCELLED) reject all transitions', () => {
      // eslint-disable-next-line security/detect-object-injection
      const terminalStates = INVOICE_STATUSES.filter(s => INVOICE_TRANSITIONS[s].length === 0);

      fc.assert(
        fc.property(
          fc.constantFrom(...terminalStates),
          fc.constantFrom(...INVOICE_STATUSES),
          (fromStatus, toStatus) => {
            expect(() =>
              validateTransition(fromStatus, toStatus, INVOICE_TRANSITIONS, 'invoice'),
            ).toThrow(BadRequestException);
          },
        ),
        { numRuns: 60 },
      );
    });
  });

  describe('custom TransitionMap', () => {
    it('is deterministic — same inputs always produce same result', () => {
      const transitions: TransitionMap = { A: ['B', 'C'], B: ['C'], C: [] };

      fc.assert(
        fc.property(fc.constantFrom('A', 'B', 'C'), fc.constantFrom('A', 'B', 'C'), (from, to) => {
          const run1 = (() => {
            try {
              validateTransition(from, to, transitions, 'test');
              return 'ok';
            } catch {
              return 'throw';
            }
          })();
          const run2 = (() => {
            try {
              validateTransition(from, to, transitions, 'test');
              return 'ok';
            } catch {
              return 'throw';
            }
          })();
          expect(run1).toBe(run2);
        }),
        { numRuns: 50 },
      );
    });
  });
});

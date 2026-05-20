import { BadRequestException } from '@nestjs/common';
import { validateTransition, TransitionMap } from './state-machine';

describe('validateTransition', () => {
  const transitions: TransitionMap = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE: ['PAID', 'CANCELLED'],
    PAID: [],
    CANCELLED: [],
  };

  it('should allow valid transitions', () => {
    expect(() => validateTransition('DRAFT', 'SENT', transitions, 'invoice')).not.toThrow();
    expect(() => validateTransition('DRAFT', 'CANCELLED', transitions, 'invoice')).not.toThrow();
    expect(() => validateTransition('SENT', 'PAID', transitions, 'invoice')).not.toThrow();
    expect(() => validateTransition('SENT', 'OVERDUE', transitions, 'invoice')).not.toThrow();
    expect(() => validateTransition('OVERDUE', 'PAID', transitions, 'invoice')).not.toThrow();
  });

  it('should block invalid transitions', () => {
    expect(() => validateTransition('DRAFT', 'PAID', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
    expect(() => validateTransition('PAID', 'DRAFT', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
    expect(() => validateTransition('CANCELLED', 'DRAFT', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
    expect(() => validateTransition('PAID', 'SENT', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
  });

  it('should block transitions from terminal states', () => {
    expect(() => validateTransition('PAID', 'CANCELLED', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
    expect(() => validateTransition('CANCELLED', 'SENT', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
  });

  it('should include entity name and statuses in error message', () => {
    try {
      validateTransition('PAID', 'DRAFT', transitions, 'invoice');
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('invoice');
      expect((error as BadRequestException).message).toContain('PAID');
      expect((error as BadRequestException).message).toContain('DRAFT');
    }
  });

  it('should handle unknown current status', () => {
    expect(() => validateTransition('UNKNOWN', 'DRAFT', transitions, 'invoice')).toThrow(
      BadRequestException,
    );
  });

  describe('booking transitions', () => {
    const bookingTransitions: TransitionMap = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CHECKED_IN: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    it('should allow valid booking flow', () => {
      expect(() =>
        validateTransition('PENDING', 'CONFIRMED', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() =>
        validateTransition('CONFIRMED', 'CHECKED_IN', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() =>
        validateTransition('CHECKED_IN', 'IN_PROGRESS', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() =>
        validateTransition('IN_PROGRESS', 'COMPLETED', bookingTransitions, 'booking'),
      ).not.toThrow();
    });

    it('should block backward transitions', () => {
      expect(() =>
        validateTransition('COMPLETED', 'PENDING', bookingTransitions, 'booking'),
      ).toThrow(BadRequestException);
      expect(() =>
        validateTransition('CONFIRMED', 'PENDING', bookingTransitions, 'booking'),
      ).toThrow(BadRequestException);
      expect(() =>
        validateTransition('IN_PROGRESS', 'CHECKED_IN', bookingTransitions, 'booking'),
      ).toThrow(BadRequestException);
    });

    it('should allow cancellation from PENDING and CONFIRMED only', () => {
      expect(() =>
        validateTransition('PENDING', 'CANCELLED', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() =>
        validateTransition('CONFIRMED', 'CANCELLED', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() =>
        validateTransition('COMPLETED', 'CANCELLED', bookingTransitions, 'booking'),
      ).toThrow(BadRequestException);
    });

    it('should allow NO_SHOW only from CONFIRMED', () => {
      expect(() =>
        validateTransition('CONFIRMED', 'NO_SHOW', bookingTransitions, 'booking'),
      ).not.toThrow();
      expect(() => validateTransition('PENDING', 'NO_SHOW', bookingTransitions, 'booking')).toThrow(
        BadRequestException,
      );
    });
  });
});

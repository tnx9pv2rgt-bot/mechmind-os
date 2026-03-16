import { BadRequestException } from '@nestjs/common';

export type TransitionMap = Record<string, string[]>;

export function validateTransition(
  currentStatus: string,
  newStatus: string,
  allowedTransitions: TransitionMap,
  entityName: string,
): void {
  const allowed = allowedTransitions[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid ${entityName} status transition: ${currentStatus} → ${newStatus}. ` +
        `Allowed from ${currentStatus}: ${allowed?.join(', ') || 'none'}`,
    );
  }
}

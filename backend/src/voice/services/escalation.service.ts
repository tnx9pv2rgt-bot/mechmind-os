import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { QueueService } from '@common/services/queue.service';
import { LoggerService } from '@common/services/logger.service';

export interface Agent {
  id: string;
  name: string;
  phone: string;
  available: boolean;
}

export interface EscalationResult {
  escalated: boolean;
  agentId?: string;
  reason: string;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Find an available agent for transfer
   */
  async findAvailableAgent(tenantId: string, _category?: string): Promise<Agent | null> {
    this.logger.log(`Finding available agent for tenant ${tenantId}`, 'EscalationService');

    // In a real implementation, this would check:
    // 1. Agent availability status in real-time
    // 2. Agent skills/categories
    // 3. Current queue length per agent
    // 4. Agent working hours

    // For now, return a manager from the tenant
    const agent = await this.prisma.user.findFirst({
      where: {
        tenantId,
        role: 'MANAGER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      phone: '', // Would be fetched from agent profile
      available: true,
    };
  }

  /**
   * Transfer call to agent
   */
  async transferToAgent(
    callId: string,
    agentId: string,
    reason: string,
  ): Promise<EscalationResult> {
    this.logger.log(`Transferring call ${callId} to agent ${agentId}`, 'EscalationService');

    // In a real implementation, this would:
    // 1. Use Vapi API to transfer the call
    // 2. Update call status in database
    // 3. Notify the agent

    // Queue transfer job
    await this.queueService.addVoiceJob('transfer-call', {
      type: 'transfer-call',
      payload: {
        callId,
        agentId,
        reason,
      },
    });

    return {
      escalated: true,
      agentId,
      reason: `Transferred to agent: ${reason}`,
    };
  }

  /**
   * Queue customer for callback when no agents available
   */
  async queueForCallback(tenantId: string, customerPhone: string, reason: string): Promise<void> {
    this.logger.log(`Queuing ${customerPhone.slice(0, 4)}*** for callback`, 'EscalationService');

    await this.queueService.addVoiceJob(
      'schedule-callback',
      {
        type: 'schedule-callback',
        payload: {
          customerPhone,
          reason,
          priority: 'high',
        },
        tenantId,
      },
      {
        priority: 5, // Higher priority
        delay: 300000, // 5 minutes delay
      },
    );

    // Also notify managers
    await this.queueService.addNotificationJob('notify-callback-needed', {
      type: 'callback-needed',
      payload: {
        customerPhone,
        reason,
      },
      tenantId,
    });
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(
    _tenantId: string,
    _fromDate?: Date,
    _toDate?: Date,
  ): Promise<{
    totalEscalations: number;
    averageWaitTime: number;
    successfulTransfers: number;
    callbackQueueLength: number;
  }> {
    // In a real implementation, this would query an escalation/transfer table
    // For now, return placeholder stats
    return {
      totalEscalations: 0,
      averageWaitTime: 0,
      successfulTransfers: 0,
      callbackQueueLength: 0,
    };
  }

  /**
   * Determine if escalation is needed based on call context
   */
  shouldEscalate(
    transcript: string,
    intent: string,
    sentiment: 'positive' | 'neutral' | 'negative',
  ): { shouldEscalate: boolean; reason?: string } {
    // Escalate if:
    // 1. Customer explicitly asks for human
    if (
      transcript.toLowerCase().includes('human') ||
      transcript.toLowerCase().includes('agent') ||
      transcript.toLowerCase().includes('operator')
    ) {
      return { shouldEscalate: true, reason: 'Customer requested human agent' };
    }

    // 2. Negative sentiment detected
    if (sentiment === 'negative') {
      return { shouldEscalate: true, reason: 'Negative sentiment detected' };
    }

    // 3. Complex complaint
    if (intent === 'complaint' && transcript.length > 200) {
      return { shouldEscalate: true, reason: 'Complex complaint requires human review' };
    }

    // 4. Multiple failed attempts
    // This would require tracking conversation state

    return { shouldEscalate: false };
  }
}

/**
 * MechMind OS - WebSocket JWT Guard
 * 
 * JWT authentication guard for WebSocket connections
 */

import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user data to socket
      client.data.user = payload;

      return true;
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`);
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try to get token from auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try to get token from query parameters
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    // Try to get token from headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      if (bearer === 'Bearer' && token) {
        return token;
      }
    }

    return undefined;
  }
}

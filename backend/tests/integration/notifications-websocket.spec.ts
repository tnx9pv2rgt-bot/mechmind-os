import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';

describe('Notifications WebSocket Integration', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  const apiUrl = process.env.TEST_API_URL || 'http://localhost:3001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3001);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WebSocket Connection', () => {
    it('should connect successfully with valid token', (done) => {
      clientSocket = io(`${apiUrl}/notifications`, {
        auth: {
          token: 'valid-test-token',
        },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (err) => {
        done(err);
      });
    });

    it('should receive connection acknowledgment', (done) => {
      clientSocket.on('connected', (data) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should disconnect without token', (done) => {
      const unauthorizedSocket = io(`${apiUrl}/notifications`, {
        transports: ['websocket'],
      });

      unauthorizedSocket.on('connect_error', () => {
        expect(unauthorizedSocket.connected).toBe(false);
        unauthorizedSocket.close();
        done();
      });

      setTimeout(() => {
        unauthorizedSocket.close();
        done();
      }, 1000);
    });
  });

  describe('Notification Broadcasting', () => {
    let client2: Socket;

    beforeEach((done) => {
      client2 = io(`${apiUrl}/notifications`, {
        auth: { token: 'valid-test-token-2' },
        transports: ['websocket'],
      });
      
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) done();
      };

      clientSocket.on('connect', onConnect);
      client2.on('connect', onConnect);
    });

    afterEach(() => {
      client2.close();
    });

    it('should broadcast notification to all clients in tenant', (done) => {
      const testNotification = {
        type: 'booking_created',
        title: 'Test Booking',
        message: 'New booking received',
      };

      let receivedCount = 0;
      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 2) done();
      };

      clientSocket.on('notification:new', (data) => {
        expect(data.title).toBe(testNotification.title);
        checkDone();
      });

      client2.on('notification:new', (data) => {
        expect(data.title).toBe(testNotification.title);
        checkDone();
      });

      // Emit from server
      clientSocket.emit('test:broadcast', testNotification);
    });

    it('should sync read status across clients', (done) => {
      const notificationId = 'test-notif-123';

      client2.on('notification:read:sync', (data) => {
        expect(data.notificationId).toBe(notificationId);
        done();
      });

      clientSocket.emit('notification:read', { notificationId });
    });
  });

  describe('Reconnection Logic', () => {
    it('should reconnect automatically on disconnect', (done) => {
      let connectCount = 0;

      clientSocket.on('connect', () => {
        connectCount++;
        if (connectCount === 1) {
          // Force disconnect
          clientSocket.io.engine.close();
        } else if (connectCount === 2) {
          // Successfully reconnected
          done();
        }
      });
    }, 10000);
  });
});

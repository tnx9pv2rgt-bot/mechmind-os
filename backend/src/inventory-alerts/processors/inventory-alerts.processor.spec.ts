import { InventoryAlertsProcessor } from './inventory-alerts.processor';
import { InventoryAlertsService } from '../services/inventory-alerts.service';
import { Job } from 'bullmq';

describe('InventoryAlertsProcessor', () => {
  let processor: InventoryAlertsProcessor;
  let mockService: jest.Mocked<Pick<InventoryAlertsService, 'runForAllTenants'>>;

  beforeEach(() => {
    mockService = {
      runForAllTenants: jest.fn(),
    };
    processor = new InventoryAlertsProcessor(mockService as unknown as InventoryAlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should process check-all job successfully', async () => {
      // Arrange
      const mockResult = { tenantsProcessed: 2, alertsCreated: 5 };
      mockService.runForAllTenants.mockResolvedValueOnce(mockResult);
      const mockJob = {
        name: 'check-all',
      } as Job;
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockService.runForAllTenants).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('Processing job check-all');
      logSpy.mockRestore();
    });

    it('should throw error for unknown job type', async () => {
      // Arrange
      const mockJob = {
        name: 'unknown-job',
      } as Job;

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Unknown job type: unknown-job');
      expect(mockService.runForAllTenants).not.toHaveBeenCalled();
    });

    it('should log completion with result details', async () => {
      // Arrange
      const mockResult = { tenantsProcessed: 3, alertsCreated: 10 };
      mockService.runForAllTenants.mockResolvedValueOnce(mockResult);
      const mockJob = {
        name: 'check-all',
      } as Job;
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      // Act
      await processor.process(mockJob);

      // Assert: verify completion log is called with result details
      expect(logSpy).toHaveBeenCalledWith('Job completed: 3 tenants, 10 alerts');
      logSpy.mockRestore();
    });

    it('should handle service error with Error instance', async () => {
      // Arrange
      const error = new Error('Service failed');
      mockService.runForAllTenants.mockRejectedValueOnce(error);
      const mockJob = {
        name: 'check-all',
      } as Job;
      const errorSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Service failed');
      expect(errorSpy).toHaveBeenCalledWith('Job failed:', 'Service failed');
      errorSpy.mockRestore();
    });

    it('should handle service error with non-Error value', async () => {
      // Arrange
      mockService.runForAllTenants.mockRejectedValueOnce('string error');
      const mockJob = {
        name: 'check-all',
      } as Job;
      const errorSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toBeDefined();
      expect(errorSpy).toHaveBeenCalledWith('Job failed:', 'Unknown error');
      errorSpy.mockRestore();
    });

    it('should handle zero tenants and zero alerts', async () => {
      // Arrange
      const mockResult = { tenantsProcessed: 0, alertsCreated: 0 };
      mockService.runForAllTenants.mockResolvedValueOnce(mockResult);
      const mockJob = {
        name: 'check-all',
      } as Job;

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(result).toEqual({ tenantsProcessed: 0, alertsCreated: 0 });
      expect(mockService.runForAllTenants).toHaveBeenCalledTimes(1);
    });

    it('should re-throw error after logging', async () => {
      // Arrange
      const error = new Error('Critical failure');
      mockService.runForAllTenants.mockRejectedValueOnce(error);
      const mockJob = {
        name: 'check-all',
      } as Job;
      jest.spyOn(processor['logger'], 'error').mockImplementation();

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow(error);
    });

    it('should verify job.name is logged during process', async () => {
      // Arrange: ensure the initial log call happens
      const mockResult = { tenantsProcessed: 1, alertsCreated: 2 };
      mockService.runForAllTenants.mockResolvedValueOnce(mockResult);
      const mockJob = {
        name: 'check-all',
      } as Job;
      const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();

      // Act
      await processor.process(mockJob);

      // Assert: first log should be the processing log with job name
      expect(logSpy).toHaveBeenNthCalledWith(1, 'Processing job check-all');
      logSpy.mockRestore();
    });

    it('should validate job name matches check-all exactly', async () => {
      // Arrange: case sensitivity test
      const mockJob = {
        name: 'CHECK-ALL', // uppercase
      } as Job;

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Unknown job type: CHECK-ALL');
    });

    it('should handle null or undefined job name', async () => {
      // Arrange
      const mockJob = {
        name: undefined,
      } as any;

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Unknown job type: undefined');
    });

    it('should process empty job data payload', async () => {
      // Arrange: job.data can be empty object
      const mockResult = { tenantsProcessed: 0, alertsCreated: 0 };
      mockService.runForAllTenants.mockResolvedValueOnce(mockResult);
      const mockJob = {
        name: 'check-all',
        data: {},
      } as Job;

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockService.runForAllTenants).toHaveBeenCalledTimes(1);
    });
  });
});

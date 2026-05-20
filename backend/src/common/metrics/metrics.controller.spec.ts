import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;

  const mockResponse = {
    set: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getMetrics: jest
              .fn()
              .mockResolvedValue('# HELP http_requests_total\nhttp_requests_total 0'),
            getContentType: jest.fn().mockReturnValue('text/plain; version=0.0.4; charset=utf-8'),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return metrics with correct content type', async () => {
    await controller.getMetrics(mockResponse as never);

    expect(metricsService.getMetrics).toHaveBeenCalled();
    expect(mockResponse.set).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(mockResponse.end).toHaveBeenCalledWith(
      '# HELP http_requests_total\nhttp_requests_total 0',
    );
  });
});

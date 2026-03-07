/**
 * MechMind OS - OBD Streaming Controller
 * 
 * REST API endpoints for OBD streaming operations
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ObdStreamingService } from '../services/obd-streaming.service';
import {
  StartStreamingDto,
  FreezeFrameRequestDto,
  EvapTestRequestDto,
  SensorHistoryQueryDto,
  StreamResponseDto,
  FreezeFrameResponseDto,
  Mode06TestResponseDto,
  EvapTestResponseDto,
} from '../dto/obd-streaming.dto';
import { UserRole } from '@prisma/client';

@ApiTags('OBD Streaming')
@Controller('v1/obd-streaming')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObdStreamingController {
  constructor(private readonly streamingService: ObdStreamingService) {}

  @Post('streams')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Start OBD streaming session' })
  @ApiResponse({ status: 201, type: StreamResponseDto })
  async startStreaming(
    @Body() dto: StartStreamingDto,
  ): Promise<StreamResponseDto> {
    const stream = await this.streamingService.startStreaming(dto.deviceId, {
      adapterType: dto.adapterType,
      protocol: dto.protocol,
      sensors: dto.sensors,
      interval: dto.interval,
    });

    return {
      streamId: stream.id,
      deviceId: stream.deviceId,
      adapterType: stream.adapterType,
      protocol: stream.protocol,
      isActive: stream.isActive,
      startTime: stream.startTime,
      config: stream.config,
    };
  }

  @Delete('streams/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Stop OBD streaming session' })
  @ApiResponse({ status: 200 })
  async stopStreaming(@Param('id') streamId: string): Promise<void> {
    await this.streamingService.stopStreaming(streamId);
  }

  @Get('streams')
  @ApiOperation({ summary: 'Get all active streams' })
  @ApiResponse({ status: 200, type: [StreamResponseDto] })
  async getActiveStreams(): Promise<StreamResponseDto[]> {
    const streams = this.streamingService.getAllActiveStreams();
    return streams.map(stream => ({
      streamId: stream.id,
      deviceId: stream.deviceId,
      adapterType: stream.adapterType,
      protocol: stream.protocol,
      isActive: stream.isActive,
      startTime: stream.startTime,
      config: stream.config,
    }));
  }

  @Get('devices/:id/stream')
  @ApiOperation({ summary: 'Get active stream for device' })
  @ApiResponse({ status: 200, type: StreamResponseDto })
  async getDeviceStream(
    @Param('id') deviceId: string,
  ): Promise<StreamResponseDto | null> {
    const stream = this.streamingService.getActiveStream(deviceId);
    if (!stream) return null;

    return {
      streamId: stream.id,
      deviceId: stream.deviceId,
      adapterType: stream.adapterType,
      protocol: stream.protocol,
      isActive: stream.isActive,
      startTime: stream.startTime,
      config: stream.config,
    };
  }

  @Post('freeze-frame')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Capture freeze frame data' })
  @ApiResponse({ status: 201, type: FreezeFrameResponseDto })
  async captureFreezeFrame(
    @Body() dto: FreezeFrameRequestDto,
  ): Promise<FreezeFrameResponseDto> {
    const freezeFrame = await this.streamingService.captureFreezeFrame(
      dto.deviceId,
      dto.dtcCode,
    );

    return {
      id: freezeFrame.id,
      deviceId: freezeFrame.deviceId,
      dtcCode: freezeFrame.dtcCode,
      capturedAt: freezeFrame.capturedAt,
      data: freezeFrame.data,
    };
  }

  @Get('devices/:id/mode06')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Get Mode $06 test results' })
  @ApiResponse({ status: 200, type: [Mode06TestResponseDto] })
  async getMode06Tests(
    @Param('id') deviceId: string,
  ): Promise<Mode06TestResponseDto[]> {
    return await this.streamingService.getMode06Tests(deviceId);
  }

  @Post('evap-test')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MECHANIC)
  @ApiOperation({ summary: 'Execute Mode $08 EVAP test' })
  @ApiResponse({ status: 201, type: EvapTestResponseDto })
  async executeEvapTest(
    @Body() dto: EvapTestRequestDto,
  ): Promise<EvapTestResponseDto> {
    const test = await this.streamingService.executeEvapTest(
      dto.deviceId,
      dto.testType,
    );

    return {
      id: test.id,
      deviceId: test.deviceId,
      testType: test.testType,
      startedAt: test.startedAt,
      completedAt: test.completedAt,
      status: test.status,
      results: test.results,
    };
  }

  @Get('sensor-history')
  @ApiOperation({ summary: 'Get sensor history' })
  @ApiResponse({ status: 200 })
  async getSensorHistory(
    @Query() query: SensorHistoryQueryDto,
  ): Promise<{ timestamp: Date; value: number }[]> {
    return await this.streamingService.getSensorHistory(
      query.deviceId,
      query.sensor,
      new Date(query.from),
      new Date(query.to),
      query.aggregation,
    );
  }

  @Post('devices/:id/retention')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply data retention policy' })
  @ApiResponse({ status: 200 })
  async applyRetentionPolicy(
    @Param('id') deviceId: string,
    @Query('days') days: number,
  ): Promise<{ deleted: number }> {
    const deleted = await this.streamingService.applyRetentionPolicy(deviceId, days);
    return { deleted };
  }
}

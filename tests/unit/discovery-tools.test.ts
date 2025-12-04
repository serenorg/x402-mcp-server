// ABOUTME: Tests for discovery MCP tools (listPublishers, getPublisherDetails)
// ABOUTME: Tests input validation, gateway communication, and response formatting

import { jest } from '@jest/globals';
import { listPublishers, ListPublishersInput } from '../../src/tools/listPublishers.js';
import { getPublisherDetails, GetPublisherDetailsInput } from '../../src/tools/getPublisherDetails.js';
import type { GatewayClient } from '../../src/gateway/client.js';

describe('listPublishers', () => {
  let mockGateway: jest.Mocked<GatewayClient>;

  const mockPublishers = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Publisher 1',
      publisherType: 'api' as const,
      pricePerCall: '0.01',
      categories: ['finance'],
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Test Publisher 2',
      publisherType: 'database' as const,
      pricePerCall: '0.05',
      categories: ['analytics'],
    },
  ];

  beforeEach(() => {
    mockGateway = {
      listPublishers: jest.fn().mockResolvedValue(mockPublishers),
      getPublisher: jest.fn(),
      proxyRequest: jest.fn(),
      encodePaymentPayload: jest.fn(),
      decodePaymentResponse: jest.fn(),
    } as unknown as jest.Mocked<GatewayClient>;
  });

  describe('without filters', () => {
    it('should return all publishers', async () => {
      const result = await listPublishers({}, mockGateway);

      expect(result.success).toBe(true);
      expect(result.publishers).toHaveLength(2);
      expect(mockGateway.listPublishers).toHaveBeenCalledWith({});
    });
  });

  describe('with category filter', () => {
    it('should pass category to gateway', async () => {
      await listPublishers({ category: 'finance' }, mockGateway);

      expect(mockGateway.listPublishers).toHaveBeenCalledWith({ category: 'finance' });
    });
  });

  describe('with type filter', () => {
    it('should pass type to gateway', async () => {
      await listPublishers({ type: 'api' }, mockGateway);

      expect(mockGateway.listPublishers).toHaveBeenCalledWith({ type: 'api' });
    });
  });

  describe('with both filters', () => {
    it('should pass both filters to gateway', async () => {
      await listPublishers({ category: 'finance', type: 'database' }, mockGateway);

      expect(mockGateway.listPublishers).toHaveBeenCalledWith({
        category: 'finance',
        type: 'database',
      });
    });
  });

  describe('error handling', () => {
    it('should handle gateway error', async () => {
      mockGateway.listPublishers.mockRejectedValue(new Error('Gateway unavailable'));

      const result = await listPublishers({}, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gateway');
    });

    it('should return empty array when no publishers found', async () => {
      mockGateway.listPublishers.mockResolvedValue([]);

      const result = await listPublishers({}, mockGateway);

      expect(result.success).toBe(true);
      expect(result.publishers).toHaveLength(0);
    });
  });
});

describe('getPublisherDetails', () => {
  let mockGateway: jest.Mocked<GatewayClient>;

  const mockPublisher = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Publisher',
    resourceName: 'test-resource',
    resourceDescription: 'A test resource for testing',
    publisherType: 'api' as const,
    pricePerCall: '0.01',
    categories: ['finance', 'testing'],
    upstreamApiUrl: 'https://api.example.com',
  };

  beforeEach(() => {
    mockGateway = {
      listPublishers: jest.fn(),
      getPublisher: jest.fn().mockResolvedValue(mockPublisher),
      proxyRequest: jest.fn(),
      encodePaymentPayload: jest.fn(),
      decodePaymentResponse: jest.fn(),
    } as unknown as jest.Mocked<GatewayClient>;
  });

  describe('input validation', () => {
    it('should reject missing publisher_id', async () => {
      const result = await getPublisherDetails({} as GetPublisherDetailsInput, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('publisher_id');
    });

    it('should reject empty publisher_id', async () => {
      const result = await getPublisherDetails({ publisher_id: '' }, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('publisher_id');
    });
  });

  describe('successful retrieval', () => {
    it('should return publisher details', async () => {
      const result = await getPublisherDetails(
        { publisher_id: '123e4567-e89b-12d3-a456-426614174000' },
        mockGateway
      );

      expect(result.success).toBe(true);
      expect(result.publisher).toBeDefined();
      expect(result.publisher?.name).toBe('Test Publisher');
      expect(result.publisher?.pricePerCall).toBe('0.01');
    });

    it('should call gateway with correct publisher_id', async () => {
      await getPublisherDetails(
        { publisher_id: '123e4567-e89b-12d3-a456-426614174000' },
        mockGateway
      );

      expect(mockGateway.getPublisher).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });
  });

  describe('error handling', () => {
    it('should handle publisher not found', async () => {
      mockGateway.getPublisher.mockRejectedValue(new Error('Publisher not found: unknown-id'));

      const result = await getPublisherDetails({ publisher_id: 'unknown-id' }, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle gateway error', async () => {
      mockGateway.getPublisher.mockRejectedValue(new Error('Gateway unavailable'));

      const result = await getPublisherDetails(
        { publisher_id: '123e4567-e89b-12d3-a456-426614174000' },
        mockGateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gateway');
    });
  });
});

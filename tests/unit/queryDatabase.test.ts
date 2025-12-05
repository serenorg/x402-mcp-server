// ABOUTME: Unit tests for queryDatabase tool
// ABOUTME: Tests input validation, payment flow, and error handling

import { jest } from '@jest/globals';
import { queryDatabase, QueryDatabaseInput } from '../../src/tools/queryDatabase.js';
import type { WalletProvider } from '../../src/wallet/types.js';
import type { GatewayClient } from '../../src/gateway/client.js';
import type { PaymentRequirementsResponse, QueryResult } from '../../src/gateway/types.js';

// Mock wallet provider
function createMockWallet(overrides: Partial<WalletProvider> = {}): WalletProvider {
  return {
    isConnected: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue(undefined),
    getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    signTypedData: jest.fn().mockResolvedValue('0x' + 'ab'.repeat(65)),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Mock gateway client
function createMockGateway(overrides: Partial<GatewayClient> = {}): GatewayClient {
  return {
    queryDatabase: jest.fn(),
    proxyRequest: jest.fn(),
    listPublishers: jest.fn(),
    getPublisher: jest.fn(),
    getPublisherPricing: jest.fn(),
    encodePaymentPayload: jest.fn().mockReturnValue('encoded'),
    decodePaymentResponse: jest.fn().mockReturnValue({ transaction: '0xtx123' }),
    ...overrides,
  } as unknown as GatewayClient;
}

describe('queryDatabase', () => {
  describe('input validation', () => {
    it('should reject missing publisher_id', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway();

      const result = await queryDatabase(
        { publisher_id: '', sql: 'SELECT 1' } as QueryDatabaseInput,
        wallet,
        gateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('publisher_id');
    });

    it('should reject missing sql', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway();

      const result = await queryDatabase(
        { publisher_id: 'test-id', sql: '' } as QueryDatabaseInput,
        wallet,
        gateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('sql');
    });

    it('should reject non-SELECT queries', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway();

      const result = await queryDatabase(
        { publisher_id: 'test-id', sql: 'DELETE FROM users' },
        wallet,
        gateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('SELECT');
    });

    it('should accept valid SELECT queries', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway({
        queryDatabase: jest.fn()
          .mockResolvedValueOnce({
            status: 402,
            paymentRequired: {
              x402Version: 1,
              accepts: [{
                scheme: 'exact',
                network: 'base-mainnet',
                maxAmountRequired: '1000000',
                asset: '0xusdc',
                payTo: '0xgateway',
                resource: '/api/query',
                description: 'Query',
                mimeType: 'application/json',
                outputSchema: null,
                maxTimeoutSeconds: 300,
              }],
            } as PaymentRequirementsResponse,
          })
          .mockResolvedValueOnce({
            status: 200,
            data: {
              rows: [{ id: 1 }],
              rowCount: 1,
              estimatedCost: '0.001',
              actualCost: '0.001',
              executionTime: 50,
            } as QueryResult,
          }),
      });

      const result = await queryDatabase(
        { publisher_id: 'test-id', sql: 'SELECT * FROM users LIMIT 10' },
        wallet,
        gateway
      );

      expect(result.success).toBe(true);
      expect(result.rows).toEqual([{ id: 1 }]);
    });
  });

  describe('payment flow', () => {
    it('should handle 402 response and retry with payment', async () => {
      const wallet = createMockWallet();
      const queryDatabaseMock = jest.fn()
        .mockResolvedValueOnce({
          status: 402,
          paymentRequired: {
            x402Version: 1,
            accepts: [{
              scheme: 'exact',
              network: 'base-mainnet',
              maxAmountRequired: '1000000',
              asset: '0xusdc',
              payTo: '0xgateway',
              resource: '/api/query',
              description: 'Query',
              mimeType: 'application/json',
              outputSchema: null,
              maxTimeoutSeconds: 300,
            }],
          } as PaymentRequirementsResponse,
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            rows: [{ count: 42 }],
            rowCount: 1,
            estimatedCost: '0.025',
            actualCost: '0.020',
            executionTime: 100,
            settlement: {
              payer: '0x1234567890123456789012345678901234567890',
              transaction: '0xtx456',
              network: 'base-mainnet',
            },
          } as QueryResult,
        });

      const gateway = createMockGateway({ queryDatabase: queryDatabaseMock });

      const result = await queryDatabase(
        { publisher_id: 'publisher-uuid', sql: 'SELECT COUNT(*) FROM orders' },
        wallet,
        gateway
      );

      expect(result.success).toBe(true);
      expect(result.rows).toEqual([{ count: 42 }]);
      expect(result.rowCount).toBe(1);
      expect(result.estimatedCost).toBe('0.025');
      expect(result.actualCost).toBe('0.020');
      expect(result.executionTime).toBe(100);
      expect(result.txHash).toBe('0xtx456');

      // Should have called queryDatabase twice (initial + with payment)
      expect(queryDatabaseMock).toHaveBeenCalledTimes(2);

      // First call without payment
      expect(queryDatabaseMock.mock.calls[0][0]).toEqual({
        publisherId: 'publisher-uuid',
        agentWallet: '0x1234567890123456789012345678901234567890',
        sql: 'SELECT COUNT(*) FROM orders',
      });

      // Second call with payment payload
      expect(queryDatabaseMock.mock.calls[1][1]).toBeDefined();
    });

    it('should return error when no payment method available', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway({
        queryDatabase: jest.fn().mockResolvedValue({
          status: 402,
          paymentRequired: {
            x402Version: 1,
            accepts: [], // No payment methods
          } as PaymentRequirementsResponse,
        }),
      });

      const result = await queryDatabase(
        { publisher_id: 'test-id', sql: 'SELECT 1' },
        wallet,
        gateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No payment method');
    });
  });

  describe('error handling', () => {
    it('should handle gateway errors', async () => {
      const wallet = createMockWallet();
      const gateway = createMockGateway({
        queryDatabase: jest.fn().mockRejectedValue(new Error('Gateway unavailable')),
      });

      const result = await queryDatabase(
        { publisher_id: 'test-id', sql: 'SELECT 1' },
        wallet,
        gateway
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gateway unavailable');
    });

    it('should connect wallet if not connected', async () => {
      const connectMock = jest.fn().mockResolvedValue(undefined);
      const wallet = createMockWallet({
        isConnected: jest.fn().mockResolvedValue(false),
        connect: connectMock,
      });
      const gateway = createMockGateway({
        queryDatabase: jest.fn()
          .mockResolvedValueOnce({
            status: 402,
            paymentRequired: {
              x402Version: 1,
              accepts: [{
                scheme: 'exact',
                network: 'base-mainnet',
                maxAmountRequired: '1000000',
                asset: '0xusdc',
                payTo: '0xgateway',
                resource: '/api/query',
                description: 'Query',
                mimeType: 'application/json',
                outputSchema: null,
                maxTimeoutSeconds: 300,
              }],
            },
          })
          .mockResolvedValueOnce({
            status: 200,
            data: { rows: [], rowCount: 0, estimatedCost: '0', actualCost: '0', executionTime: 0 },
          }),
      });

      await queryDatabase(
        { publisher_id: 'test-id', sql: 'SELECT 1' },
        wallet,
        gateway
      );

      expect(connectMock).toHaveBeenCalled();
    });
  });
});

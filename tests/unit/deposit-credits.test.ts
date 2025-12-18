// ABOUTME: Tests for deposit_credits MCP tool
// ABOUTME: Tests deposit instructions and gateway address retrieval

import { jest } from '@jest/globals';
import { depositCredits, DepositCreditsInput } from '../../src/tools/depositCredits.js';
import type { WalletProvider } from '../../src/wallet/types.js';
import type { GatewayClient } from '../../src/gateway/client.js';

describe('depositCredits', () => {
  let mockWallet: jest.Mocked<WalletProvider>;
  let mockGateway: jest.Mocked<GatewayClient>;

  beforeEach(() => {
    mockWallet = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signTypedData: jest.fn(),
      isConnected: jest.fn().mockResolvedValue(true),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<WalletProvider>;

    mockGateway = {
      getCreditBalance: jest.fn(),
      confirmDeposit: jest.fn(),
      listPublishers: jest.fn(),
      getPublisher: jest.fn(),
      proxyRequest: jest.fn(),
      encodePaymentPayload: jest.fn(),
      decodePaymentResponse: jest.fn(),
    } as unknown as jest.Mocked<GatewayClient>;
  });

  describe('deposit instructions', () => {
    it('should return deposit instructions with gateway wallet address', async () => {
      const input: DepositCreditsInput = { amount: '10.00' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(true);
      expect(result.instructions).toBeDefined();
      expect(result.amount).toBe('10.00');
      expect(result.gatewayWallet).toBeDefined();
    });

    it('should include step-by-step instructions', async () => {
      const input: DepositCreditsInput = { amount: '5.00' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      expect(result.steps?.length).toBeGreaterThan(0);
    });

    it('should include agent wallet address in instructions', async () => {
      const input: DepositCreditsInput = { amount: '10.00' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.agentWallet).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('validation', () => {
    it('should reject invalid amount format', async () => {
      const input: DepositCreditsInput = { amount: 'invalid' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should reject zero amount', async () => {
      const input: DepositCreditsInput = { amount: '0' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should reject negative amount', async () => {
      const input: DepositCreditsInput = { amount: '-5.00' };
      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });
  });

  describe('error handling', () => {
    it('should handle wallet connection errors', async () => {
      mockWallet.getAddress.mockRejectedValue(new Error('Wallet not connected'));
      const input: DepositCreditsInput = { amount: '10.00' };

      const result = await depositCredits(input, mockWallet, mockGateway);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet');
    });
  });
});

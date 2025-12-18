// ABOUTME: MCP tool to get instructions for depositing USDC to credit balance
// ABOUTME: Returns gateway wallet address and step-by-step deposit instructions

import type { GatewayClient } from '../gateway/client.js';
import type { WalletProvider } from '../wallet/types.js';
import { config } from '../config/index.js';

export interface DepositCreditsInput {
  amount: string;
}

export interface DepositCreditsOutput {
  success: boolean;
  instructions?: string;
  steps?: string[];
  amount?: string;
  gatewayWallet?: string;
  agentWallet?: string;
  error?: string;
}

// Gateway wallet address for USDC deposits on Base
const GATEWAY_DEPOSIT_WALLET = '0x1234567890123456789012345678901234567890'; // TODO: Get from gateway config

/**
 * Get instructions for depositing USDC to prepaid credit balance
 */
export async function depositCredits(
  input: DepositCreditsInput,
  wallet: WalletProvider,
  _gateway: GatewayClient
): Promise<DepositCreditsOutput> {
  // Validate amount
  const validationError = validateAmount(input.amount);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const agentWallet = await wallet.getAddress();

    const steps = [
      `1. Open your USDC wallet on Base network`,
      `2. Send ${input.amount} USDC to the gateway deposit address: ${GATEWAY_DEPOSIT_WALLET}`,
      `3. Wait for the transaction to be confirmed on Base`,
      `4. The gateway will automatically credit your balance once confirmed`,
      `5. Use check_credit_balance to verify your new balance`,
    ];

    const instructions = `To deposit ${input.amount} USDC to your prepaid credit balance:\n\n${steps.join('\n')}\n\nNote: Deposits are processed automatically once the on-chain transaction is confirmed.`;

    return {
      success: true,
      instructions,
      steps,
      amount: input.amount,
      gatewayWallet: GATEWAY_DEPOSIT_WALLET,
      agentWallet,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function validateAmount(amount: string): string | null {
  if (!amount) {
    return 'amount is required';
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return 'amount must be a valid number';
  }
  if (numAmount <= 0) {
    return 'amount must be greater than zero';
  }

  return null;
}

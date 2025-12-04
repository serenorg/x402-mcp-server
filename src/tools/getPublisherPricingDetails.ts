// ABOUTME: MCP tool to get detailed pricing configuration for a specific publisher
// ABOUTME: Wraps GatewayClient.getPublisherPricing() to retrieve basePricePer1000Rows and markupMultiplier

import type { GatewayClient } from '../gateway/client.js';
import type { PublisherPricingConfig } from '../gateway/types.js';

export interface GetPublisherPricingDetailsInput {
  publisher_id: string;
}

export interface GetPublisherPricingDetailsOutput {
  success: boolean;
  pricing?: PublisherPricingConfig;
  error?: string;
}

/**
 * Get detailed pricing configuration for a specific x402-protected data publisher.
 */
export async function getPublisherPricingDetails(
  input: GetPublisherPricingDetailsInput,
  gateway: GatewayClient
): Promise<GetPublisherPricingDetailsOutput> {
  if (!input.publisher_id) {
    return {
      success: false,
      error: 'Publisher ID is required',
    };
  }

  try {
    const pricing = await gateway.getPublisherPricing(input.publisher_id);
    return {
      success: true,
      pricing,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ABOUTME: MCP tool to get details for a specific x402-protected data publisher
// ABOUTME: Wraps GatewayClient.getPublisher() with input validation

import type { GatewayClient } from '../gateway/client.js';
import type { Publisher } from '../gateway/types.js';

export interface GetPublisherDetailsInput {
  publisher_id: string;
}

export interface GetPublisherDetailsOutput {
  success: boolean;
  publisher?: Publisher;
  error?: string;
}

/**
 * Get details for a specific x402-protected data publisher
 */
export async function getPublisherDetails(
  input: GetPublisherDetailsInput,
  gateway: GatewayClient
): Promise<GetPublisherDetailsOutput> {
  // Validate input
  if (!input.publisher_id || input.publisher_id.trim() === '') {
    return {
      success: false,
      error: 'publisher_id is required',
    };
  }

  try {
    const publisher = await gateway.getPublisher(input.publisher_id);

    return {
      success: true,
      publisher,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

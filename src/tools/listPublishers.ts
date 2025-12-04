// ABOUTME: MCP tool to list available x402-protected data publishers
// ABOUTME: Wraps GatewayClient.listPublishers() with optional filtering

import type { GatewayClient } from '../gateway/client.js';
import type { Publisher } from '../gateway/types.js';

export interface ListPublishersInput {
  category?: string;
  type?: 'database' | 'api' | 'both';
}

export interface ListPublishersOutput {
  success: boolean;
  publishers?: Publisher[];
  error?: string;
}

/**
 * List available x402-protected data publishers from the gateway catalog
 */
export async function listPublishers(
  input: ListPublishersInput,
  gateway: GatewayClient
): Promise<ListPublishersOutput> {
  try {
    const filters: { category?: string; type?: 'database' | 'api' | 'both' } = {};

    if (input.category) {
      filters.category = input.category;
    }
    if (input.type) {
      filters.type = input.type;
    }

    const publishers = await gateway.listPublishers(filters);

    return {
      success: true,
      publishers,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ABOUTME: Express server for web-based SQL Editor interface
// ABOUTME: Exposes x402 payment logic via HTTP API

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { SerenService } from './services/serenService.js';
import { z } from 'zod';

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Validate environment variables
const privateKey = process.env.WALLET_PRIVATE_KEY;
const gatewayUrl = config.X402_GATEWAY_URL;
const apiKey = process.env.SEREN_API_KEY;

if (!privateKey) {
  throw new Error('WALLET_PRIVATE_KEY environment variable is required');
}

// Warn if API key is missing (admin functions will fail)
if (!apiKey) {
  console.warn('⚠️  WARNING: SEREN_API_KEY is not set. Admin console functions will not work.');
}

// Initialize SerenService
const serenService = new SerenService(privateKey, gatewayUrl);

// Request validation schema
const executeSqlSchema = z.object({
  sql: z.string().min(1, 'SQL query is required'),
  providerId: z.string().min(1, 'providerId is required'),
});

const executeAdminSqlSchema = z.object({
  sql: z.string().min(1, 'SQL query is required'),
});

/**
 * POST /api/execute-sql
 * Execute a paid SQL query via x402 Gateway
 */
app.post('/api/execute-sql', async (req, res) => {
  try {
    // Validate request body
    const validationResult = executeSqlSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validationResult.error.errors,
      });
    }

    const { sql, providerId } = validationResult.data;

    // Execute query using shared service
    const result = await serenService.executeQuery({ sql, providerId });

    if (result.success) {
      return res.status(200).json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        estimatedCost: result.estimatedCost,
        actualCost: result.actualCost,
        executionTime: result.executionTime,
        txHash: result.txHash,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Query execution failed',
      });
    }
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * POST /api/admin/execute
 * Execute an admin SQL query using API key authentication
 * Bypasses x402 payment flow - allows DDL and DML operations
 */
app.post('/api/admin/execute', async (req, res) => {
  try {
    // Check if API key is configured
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Admin API key not configured. SEREN_API_KEY environment variable is required.',
      });
    }

    // Validate request body
    const validationResult = executeAdminSqlSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validationResult.error.errors,
      });
    }

    const { sql } = validationResult.data;

    // Execute admin query using shared service
    const result = await serenService.executeAdminQuery(sql, apiKey);

    if (result.success) {
      return res.status(200).json({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        estimatedCost: result.estimatedCost,
        actualCost: result.actualCost,
        executionTime: result.executionTime,
      });
    } else {
      // Determine appropriate status code based on error
      const statusCode = result.error?.includes('authentication') ? 401 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Query execution failed',
      });
    }
  } catch (error) {
    console.error('Error executing admin SQL query:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'seren-sql-api' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Seren SQL API server running on http://localhost:${PORT}`);
});


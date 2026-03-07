import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { randomUUID } from 'crypto';
import { storeHistoricalAssetsValues, storeHistoricalAccountsValues, storeHistoricalWealthValues } from '@/lib/savings';
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from '@myhomeapp/shared/lib/data';
import {
  AutomatedTaskRequest,
  AutomatedTaskExecution,
  TaskResult,
  AutomatedTaskHistory
} from '@myhomeapp/shared/models/automatedTasks';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const AUTOMATED_TASKS_FILE = path.join(DATA_PATH, 'config', 'automated-tasks-history.json');

async function taskStoreAssetsValues(): Promise<TaskResult> {
  const startTime = Date.now();

  try {
    const { assetCount, timestamp } = await storeHistoricalAssetsValues();

    return {
      taskName: 'store-assets-values',
      status: 'success',
      message: 'Asset values stored successfully',
      duration: Date.now() - startTime,
      details: { assetCount, timestamp }
    };
  } catch (error) {
    return {
      taskName: 'store-assets-values',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

async function taskStoreAccountsValues(): Promise<TaskResult> {
  const startTime = Date.now();

  try {
    const { accountCount, timestamp } = await storeHistoricalAccountsValues();

    return {
      taskName: 'store-accounts-values',
      status: 'success',
      message: 'Account values stored successfully',
      duration: Date.now() - startTime,
      details: { accountCount, timestamp }
    };
  } catch (error) {
    return {
      taskName: 'store-accounts-values',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

async function taskStoreWealthValues(): Promise<TaskResult> {
  const startTime = Date.now();

  try {
    const { timestamp } = await storeHistoricalWealthValues();

    return {
      taskName: 'store-wealth-values',
      status: 'success',
      message: 'Wealth values stored successfully',
      duration: Date.now() - startTime,
      details: { timestamp }
    };
  } catch (error) {
    return {
      taskName: 'store-wealth-values',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as AutomatedTaskRequest;
  const origin = body.origin || 'unknown';
  const executionId = randomUUID();
  const triggeredAt = new Date().toISOString();

  console.log(`[Savings Tasks] Starting execution ${executionId} from ${origin}`);

  try {
    const startTime = Date.now();

    const [assetsResult, accountsResult, wealthResult] = await Promise.all([
      taskStoreAssetsValues(),
      taskStoreAccountsValues(),
      taskStoreWealthValues()
    ]);

    const results = [assetsResult, accountsResult, wealthResult];
    const completedAt = new Date().toISOString();
    const totalDuration = Date.now() - startTime;

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    const overallStatus =
      failureCount === results.length ? 'failed' :
      failureCount > 0 ? 'partial' :
      'success';

    const execution: AutomatedTaskExecution = {
      id: executionId,
      origin,
      triggeredAt,
      completedAt,
      totalDuration,
      results,
      overallStatus,
      successCount,
      failureCount,
      skippedCount
    };

    ensureDirectoryExists(path.dirname(AUTOMATED_TASKS_FILE));
    const history = readJsonFile<AutomatedTaskHistory>(AUTOMATED_TASKS_FILE, { executions: [] });
    history.executions.push(execution);

    if (history.executions.length > 100) {
      history.executions = history.executions.slice(-100);
    }

    writeJsonFile(AUTOMATED_TASKS_FILE, history);

    console.log(`[Savings Tasks] Execution ${executionId} completed: ${overallStatus} in ${totalDuration}ms`);

    return res.status(200).json({
      executionId,
      overallStatus,
      totalDuration,
      successCount,
      failureCount,
      skippedCount,
      results
    });
  } catch (error) {
    console.error(`[Savings Tasks] Execution ${executionId} failed:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

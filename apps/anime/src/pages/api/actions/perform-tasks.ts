import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { randomUUID } from 'crypto';
import { getMALAuthData, isMALTokenValid, performBigSync } from '@/lib/anime';
import { ensureDirectoryExists, readJsonFile, writeJsonFile } from '@myhomeapp/shared/lib/data';
import {
  AutomatedTaskRequest,
  AutomatedTaskExecution,
  TaskResult,
  AutomatedTaskHistory
} from '@myhomeapp/shared/models/automatedTasks';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const AUTOMATED_TASKS_FILE = path.join(DATA_PATH, 'config', 'automated-tasks-history.json');

async function taskAnimeCronSync(): Promise<TaskResult> {
  const startTime = Date.now();

  try {
    const { token } = getMALAuthData();
    if (!token || !isMALTokenValid(token)) {
      return {
        taskName: 'anime-cron-sync',
        status: 'skipped',
        message: 'MAL token is invalid or missing',
        duration: Date.now() - startTime
      };
    }

    const result = await performBigSync(token.access_token);

    if (result.success) {
      return {
        taskName: 'anime-cron-sync',
        status: 'success',
        message: 'Anime sync completed successfully',
        duration: Date.now() - startTime,
        details: {
          syncedCount: result.syncedCount,
          processedSeasons: result.processedSeasons,
          totalSeasons: result.totalSeasons
        }
      };
    } else {
      return {
        taskName: 'anime-cron-sync',
        status: 'failed',
        error: result.error || 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      taskName: 'anime-cron-sync',
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

  console.log(`[Anime Tasks] Starting execution ${executionId} from ${origin}`);

  try {
    const startTime = Date.now();

    const animeResult = await taskAnimeCronSync();

    const results = [animeResult];
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

    console.log(`[Anime Tasks] Execution ${executionId} completed: ${overallStatus}`);

    return res.status(200).json({ success: true, execution });
  } catch (error) {
    console.error('[Anime Tasks] Execution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute anime tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

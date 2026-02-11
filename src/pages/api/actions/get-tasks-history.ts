import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readJsonFile } from '@/lib/data';
import { AutomatedTaskHistory, AutomatedTaskExecution } from '@/models/shared/automatedTasks';

const DATA_PATH = process.env.DATA_PATH || '/app/data';
const AUTOMATED_TASKS_FILE = path.join(DATA_PATH, 'config', 'automated-tasks-history.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { limit } = req.query;
    const maxResults = limit ? parseInt(limit as string, 10) : 20;

    const history = readJsonFile<AutomatedTaskHistory>(AUTOMATED_TASKS_FILE, { executions: [] });
    
    // Return most recent executions first
    const executions = history.executions
      .slice()
      .reverse()
      .slice(0, maxResults);

    return res.status(200).json({
      success: true,
      executions,
      total: history.executions.length
    });
  } catch (error) {
    console.error('Error retrieving automated tasks history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve automated tasks history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

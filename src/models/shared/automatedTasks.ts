// Automated Tasks Models

export interface AutomatedTaskRequest {
  origin: string;
  triggeredAt: string;
}

export interface TaskResult {
  taskName: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  error?: string;
  duration: number; // in milliseconds
  details?: any;
}

export interface AutomatedTaskExecution {
  id: string;
  origin: string;
  triggeredAt: string;
  completedAt: string;
  totalDuration: number; // in milliseconds
  results: TaskResult[];
  overallStatus: 'success' | 'partial' | 'failed';
  successCount: number;
  failureCount: number;
  skippedCount: number;
}

export interface AutomatedTaskHistory {
  executions: AutomatedTaskExecution[];
}

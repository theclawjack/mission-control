import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: 'every' | 'cron' | 'once';
    everyMs?: number;
    anchorMs?: number;
    expr?: string;
    tz?: string;
    atMs?: number;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
  };
}

interface CronJobsFile {
  version?: number;
  jobs: CronJob[];
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function toTimeStr(d: Date) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getUTCFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getUTCMonth() + 1));

    // Month range in UTC milliseconds
    const monthStart = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = Date.UTC(year, month, 1, 0, 0, 0, 0) - 1;

    // Read cron jobs from OpenClaw storage
    const cronJobsPath = path.join('/root/.openclaw/cron/jobs.json');
    if (!fs.existsSync(cronJobsPath)) {
      return NextResponse.json([]);
    }

    const fileContent = fs.readFileSync(cronJobsPath, 'utf-8');
    const cronData: CronJobsFile = JSON.parse(fileContent);
    const jobs: CronJob[] = cronData.jobs || [];

    // Convert cron jobs to calendar events
    const events: Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      time: string;
      type: 'cron';
      readOnly: boolean;
    }> = [];

    let virtualId = 0;

    for (const job of jobs) {
      if (!job.enabled) continue;

      const { schedule, state } = job;

      if (schedule.kind === 'every' && schedule.everyMs && schedule.everyMs > 0) {
        // Calculate occurrences within the month
        // Start from nextRunAtMs or anchorMs, walk forward/backward by everyMs
        const interval = schedule.everyMs;
        const anchor = state?.nextRunAtMs ?? schedule.anchorMs ?? Date.now();

        // Find the first occurrence at or after monthStart
        // anchor could be before or after monthStart
        let start = anchor;
        if (start < monthStart) {
          // Walk forward from anchor to monthStart
          const stepsNeeded = Math.ceil((monthStart - start) / interval);
          start = start + stepsNeeded * interval;
        } else if (start > monthEnd) {
          // No occurrences this month
          continue;
        }

        // Collect all occurrences within the month (cap at 30)
        let t = start;
        let count = 0;
        while (t <= monthEnd && count < 30) {
          const d = new Date(t);
          events.push({
            id: `cron-${job.id}-${virtualId++}`,
            title: job.name,
            description: `OpenClaw cron · every ${formatDuration(interval)}`,
            date: toDateStr(d),
            time: toTimeStr(d),
            type: 'cron',
            readOnly: true,
          });
          t += interval;
          count++;
        }
      } else if (schedule.kind === 'cron' || schedule.kind === 'once') {
        // For cron expression or once schedules: include nextRunAtMs if in month
        const nextRun = state?.nextRunAtMs;
        if (nextRun && nextRun >= monthStart && nextRun <= monthEnd) {
          const d = new Date(nextRun);
          events.push({
            id: `cron-${job.id}-${virtualId++}`,
            title: job.name,
            description:
              schedule.kind === 'cron'
                ? `OpenClaw cron · ${schedule.expr}${schedule.tz ? ' @ ' + schedule.tz : ''}`
                : `OpenClaw one-shot job`,
            date: toDateStr(d),
            time: toTimeStr(d),
            type: 'cron',
            readOnly: true,
          });
        }
      }
    }

    return NextResponse.json(events);
  } catch (e) {
    console.error('cron-events error:', e);
    return NextResponse.json([]);
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

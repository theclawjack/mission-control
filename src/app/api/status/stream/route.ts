import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function sendStatuses() {
        try {
          const db = getDb();
          const statuses = db.prepare('SELECT * FROM agent_status ORDER BY agent_name').all() as Record<string, unknown>[];
          const now = Date.now();
          const result = statuses.map((s) => {
            const lastSeenMs = new Date(s.updated_at as string).getTime();
            const secondsAgo = Math.floor((now - lastSeenMs) / 1000);
            let effectiveStatus = s.status as string;
            if (secondsAgo > 3600) effectiveStatus = 'offline';
            return { ...s, seconds_since_update: secondsAgo, effective_status: effectiveStatus };
          });

          const data = `data: ${JSON.stringify(result)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // ignore DB errors mid-stream
        }
      }

      // Send immediately
      sendStatuses();

      // Poll every 5 seconds
      const interval = setInterval(sendStatuses, 5000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

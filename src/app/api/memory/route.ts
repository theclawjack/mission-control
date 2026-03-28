import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const WORKSPACE = '/root/.openclaw/workspace';

interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  content: string;
}

function readFilesSafe(dir: string, pattern?: RegExp): MemoryFile[] {
  const files: MemoryFile[] = [];
  try {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (pattern && !pattern.test(entry)) continue;
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({
            name: entry,
            path: fullPath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            content,
          });
        }
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // skip unreadable directory
  }
  return files;
}

export async function GET(request: NextRequest) {
  const authErr = requireAuth(request); if (authErr) return authErr;
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    const files: MemoryFile[] = [];

    // Read MEMORY.md from workspace root
    const memoryMdPath = path.join(WORKSPACE, 'MEMORY.md');
    if (fs.existsSync(memoryMdPath)) {
      try {
        const stat = fs.statSync(memoryMdPath);
        const content = fs.readFileSync(memoryMdPath, 'utf-8');
        files.push({
          name: 'MEMORY.md',
          path: memoryMdPath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          content,
        });
      } catch {
        // skip
      }
    }

    // Read files from memory/ subdirectory
    const memDir = path.join(WORKSPACE, 'memory');
    const memFiles = readFilesSafe(memDir, /\.md$/i);
    // Sort by modified date descending
    memFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    files.push(...memFiles);

    // Apply search filter if query provided
    if (query) {
      return NextResponse.json(
        files.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.content.toLowerCase().includes(query)
        )
      );
    }

    return NextResponse.json(files);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to read memory files' }, { status: 500 });
  }
}

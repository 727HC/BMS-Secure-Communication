import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { z } from 'zod';

const WIKI_DIR = join(import.meta.dirname, '..', 'wiki');

async function listMdFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'assets') continue;
    if (entry.isDirectory()) files.push(...await listMdFiles(full));
    else if (extname(entry.name) === '.md') files.push(full);
  }
  return files;
}

const server = new McpServer({ name: 'bms-wiki', version: '1.0.0' });

server.tool('wiki_list', '위키 페이지 목록 조회', {}, async () => {
  const files = await listMdFiles(WIKI_DIR);
  const list = files.map(f => relative(WIKI_DIR, f));
  return { content: [{ type: 'text', text: list.join('\n') }] };
});

server.tool('wiki_read', '위키 페이지 읽기', { path: z.string().describe('위키 내 파일 경로 (예: passport/overview.md)') }, async ({ path: p }) => {
  try {
    const content = await readFile(join(WIKI_DIR, p), 'utf-8');
    const st = await stat(join(WIKI_DIR, p));
    return { content: [{ type: 'text', text: `# ${p}\n(수정: ${st.mtime.toISOString()})\n\n${content}` }] };
  } catch {
    return { content: [{ type: 'text', text: `파일을 찾을 수 없습니다: ${p}` }], isError: true };
  }
});

server.tool('wiki_search', '위키 전체 검색', { query: z.string().describe('검색 키워드') }, async ({ query }) => {
  const files = await listMdFiles(WIKI_DIR);
  const q = query.toLowerCase();
  const results = [];

  for (const f of files) {
    const content = await readFile(f, 'utf-8');
    if (content.toLowerCase().includes(q)) {
      const rel = relative(WIKI_DIR, f);
      const matches = content.split('\n')
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter(({ line }) => line.toLowerCase().includes(q))
        .slice(0, 3);
      results.push({ file: rel, matches });
    }
  }

  if (!results.length) return { content: [{ type: 'text', text: `"${query}" — 결과 없음` }] };

  const text = results.map(r => {
    const ml = r.matches.map(m => `  L${m.num}: ${m.line}`).join('\n');
    return `${r.file}\n${ml}`;
  }).join('\n\n');

  return { content: [{ type: 'text', text: `검색: "${query}" — ${results.length}건\n\n${text}` }] };
});

server.tool('wiki_activity', '도메인별 공개 개요 조회', {}, async () => {
  const domains = ['passport', 'blockchain', 'embedded', 'mcp'];
  const summaries = [];

  for (const domain of domains) {
    try {
      const content = await readFile(join(WIKI_DIR, domain, 'overview.md'), 'utf-8');
      const summary = content.split('\n').filter(line => line.trim()).slice(0, 18).join('\n');
      summaries.push(`### ${domain}\n${summary}`);
    } catch {
      summaries.push(`### ${domain}\n(overview.md 없음)`);
    }
  }

  return { content: [{ type: 'text', text: summaries.join('\n\n') }] };
});

server.tool('wiki_design', '디자인 가이드라인 조회', {}, async () => {
  try {
    const tokens = await readFile(join(WIKI_DIR, 'passport', 'design-tokens.md'), 'utf-8');
    const refs = await readFile(join(WIKI_DIR, 'passport', 'ui-references.md'), 'utf-8');
    return { content: [{ type: 'text', text: `${tokens}\n\n---\n\n${refs}` }] };
  } catch {
    return { content: [{ type: 'text', text: 'passport 디자인 문서를 읽을 수 없습니다.' }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

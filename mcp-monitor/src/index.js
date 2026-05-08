#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const txMonitor = require('./tools/tx-monitor');
const bmuMonitor = require('./tools/bmu-monitor');
const vcMonitor = require('./tools/vc-monitor');
const systemStatus = require('./tools/system-status');
const passportMonitor = require('./tools/passport-monitor');

const server = new McpServer({
  name: 'bms-blockchain-monitor',
  version: '1.0.0',
});

// ============================================================
// Tool 1: Fabric Transaction Monitoring
// ============================================================

server.tool(
  'monitor_transactions',
  'Fabric 블록체인 트랜잭션 모니터링. 최근 트랜잭션 목록, 성공/실패 통계, TPS 측정, 특정 함수 호출 필터링',
  {
    action: z.enum(['recent', 'stats', 'search']).describe(
      'recent: 최근 트랜잭션 목록, stats: 성공/실패 통계 및 TPS, search: 특정 함수명으로 검색'
    ),
    limit: z.number().int().min(1).max(500).optional().default(20).describe('조회할 트랜잭션 수 (recent/search)'),
    function_name: z.string().optional().describe('검색할 체인코드 함수명 (search 시 필수)'),
    passport_id: z.string().optional().describe('특정 여권 ID로 필터링'),
    hours: z.number().min(0.1).max(720).optional().default(24).describe('통계 집계 시간 범위 (stats)'),
  },
  async (params) => {
    try {
      const result = await txMonitor.execute(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ============================================================
// Tool 2: BMU Data Anomaly Detection
// ============================================================

server.tool(
  'monitor_bmu',
  'BMU 배터리 데이터 이상 탐지. SOC/전압/온도 임계값 초과, 데이터 수신 빈도 모니터링, 서명 검증 상태',
  {
    action: z.enum(['anomalies', 'latest', 'frequency', 'thresholds']).describe(
      'anomalies: 임계값 초과 데이터 탐지, latest: 최신 BMU 데이터, frequency: 수신 빈도 분석, thresholds: 현재 임계값 설정 조회/변경'
    ),
    passport_id: z.string().optional().describe('특정 여권 ID로 필터링'),
    limit: z.number().int().min(1).max(500).optional().default(50).describe('조회할 레코드 수'),
    hours: z.number().min(0.1).max(720).optional().default(1).describe('분석 시간 범위'),
    set_thresholds: z.object({
      soc_min: z.number().optional(),
      soc_max: z.number().optional(),
      voltage_min: z.number().optional(),
      voltage_max: z.number().optional(),
      temp_min: z.number().optional(),
      temp_max: z.number().optional(),
    }).optional().describe('임계값 변경 (thresholds 액션에서 사용)'),
  },
  async (params) => {
    try {
      const result = await bmuMonitor.execute(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ============================================================
// Tool 3: VC Event Tracking
// ============================================================

server.tool(
  'monitor_vc',
  'Verifiable Credential 이벤트 추적. VC 발급/폐기 이벤트 로그, 만료 임박 VC 알림, 상태 통계',
  {
    action: z.enum(['events', 'expiring', 'stats', 'revoked']).describe(
      'events: 최근 VC 이벤트 목록, expiring: 만료 임박 VC, stats: VC 상태 통계, revoked: 폐기된 VC 목록'
    ),
    passport_id: z.string().optional().describe('특정 여권 ID로 필터링'),
    cred_type: z.string().optional().describe('VC 타입 필터 (BATTERY_PASSPORT, BATTERY_HEALTH, MAINTENANCE, COMPLIANCE, RECYCLING)'),
    days_until_expiry: z.number().int().min(1).max(365).optional().default(30).describe('만료 임박 기준 일수 (expiring)'),
    limit: z.number().int().min(1).max(500).optional().default(20).describe('조회할 항목 수'),
  },
  async (params) => {
    try {
      const result = await vcMonitor.execute(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ============================================================
// Tool 4: System Status
// ============================================================

server.tool(
  'system_status',
  '시스템 상태 모니터링. Fabric peer/orderer/CA, VON Network, ACA-Py, Agent 컨테이너 및 프로세스 상태 확인',
  {
    action: z.enum(['overview', 'fabric', 'von', 'acapy', 'agent', 'docker']).describe(
      'overview: 전체 시스템 요약, fabric: Fabric 노드 상세, von: VON Network 상태, acapy: ACA-Py 상태, agent: Agent 상태, docker: Docker 컨테이너 목록'
    ),
    verbose: z.boolean().optional().default(false).describe('상세 정보 출력'),
  },
  async (params) => {
    try {
      const result = await systemStatus.execute(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ============================================================
// Tool 5: Passport API Observability
// ============================================================

server.tool(
  'monitor_passport',
  'Passport API와 감사 로그를 읽기 전용으로 관찰한다. /api/status, /api/audit, BMU ingestion/invalidation/error trend, VC verification trend, 3차년도 기능시험 alert payload를 제공',
  {
    action: z.enum(['status', 'audit', 'trends', 'observation_plan']).describe(
      'status: /api/status GET probe, audit: /api/audit 또는 audit.log 조회, trends: BMU/VC/error trend 집계, observation_plan: 관찰 항목/alert/검증 기준'
    ),
    hours: z.number().min(0.1).max(720).optional().default(24).describe('trend/audit 집계 시간 범위'),
    limit: z.number().int().min(1).max(500).optional().default(50).describe('조회/집계할 최대 항목 수'),
    source: z.enum(['auto', 'api', 'local']).optional().default('auto').describe(
      'audit/trends 소스: auto는 PASSPORT_AUDIT_TOKEN 있으면 /api/audit, 없으면 logs/audit.log'
    ),
    include_examples: z.boolean().optional().default(true).describe('alert/handoff payload 예시 포함 여부'),
  },
  async (params) => {
    try {
      const result = await passportMonitor.execute(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ============================================================
// Resources: Structured Log Stream
// ============================================================

server.resource(
  'agent-logs',
  'file:///logs/agent.log',
  { description: 'Agent structured JSON 로그 (최근 100줄)', mimeType: 'application/json' },
  async () => {
    try {
      const logs = require('./utils/log-reader').readRecentLogs(100);
      return { contents: [{ uri: 'file:///logs/agent.log', text: JSON.stringify(logs, null, 2), mimeType: 'application/json' }] };
    } catch (err) {
      return { contents: [{ uri: 'file:///logs/agent.log', text: JSON.stringify({ error: err.message }), mimeType: 'application/json' }] };
    }
  }
);

// Graceful shutdown
const fabricClient = require('./utils/fabric-client');

function shutdown(signal) {
  console.error(`${signal} received, shutting down...`);
  fabricClient.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BMS Blockchain MCP Monitor started');
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});

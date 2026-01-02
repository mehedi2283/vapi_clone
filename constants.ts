import { Assistant, CallLog, MetricData, Organization, FileItem, ToolItem } from './types';

// TODO: Replace with your actual Vapi Private Key
export const VAPI_PRIVATE_KEY = '4535e480-b370-41d2-b275-bb85d4870aa4'; 
export const NIYA_ORG_ID = 'org_niya';

export const MOCK_METRICS: MetricData[] = Array.from({ length: 7 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
    calls: Math.floor(Math.random() * 50) + 10,
    minutes: Math.floor(Math.random() * 200) + 20,
    cost: Number((Math.random() * 5 + 0.5).toFixed(2)),
  };
});

export const MOCK_ASSISTANTS: Assistant[] = [
  {
    id: 'asst_sarah',
    orgId: NIYA_ORG_ID,
    name: 'Sarah - Dental Receptionist',
    model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'You are a helpful dental receptionist named Sarah.', temperature: 0.7 },
    voice: { provider: '11labs', voiceId: 'sarah' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-10-15T09:00:00Z'
  },
  {
    id: 'asst_mary',
    orgId: NIYA_ORG_ID,
    name: 'Mary - Customer Support',
    model: { provider: 'anthropic', model: 'claude-3-opus', systemPrompt: 'You are a polite customer support agent.', temperature: 0.5 },
    voice: { provider: 'playht', voiceId: 'susan' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-11-20T14:30:00Z'
  },
  {
    id: 'asst_david',
    orgId: 'org_1',
    name: 'David - Tech Support',
    model: { provider: 'openai', model: 'gpt-3.5-turbo', systemPrompt: 'You are a tech support specialist.', temperature: 0.2 },
    voice: { provider: '11labs', voiceId: 'rachel' }, // Using 'rachel' which maps to 'Kore' in Gemini
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-05T11:15:00Z'
  }
];

export const MOCK_LOGS: CallLog[] = [
  { id: 'call_1', assistantId: 'asst_sarah', status: 'completed', duration: '2m 14s', cost: 0.12, startedAt: '2023-11-05 10:23 AM' },
  { id: 'call_2', assistantId: 'asst_sarah', status: 'completed', duration: '5m 01s', cost: 0.28, startedAt: '2023-11-05 11:45 AM' },
  { id: 'call_3', assistantId: 'asst_mary', status: 'failed', duration: '0s', cost: 0.00, startedAt: '2023-11-06 09:12 AM' },
  { id: 'call_4', assistantId: 'asst_mary', status: 'active', duration: '1m 20s', cost: 0.05, startedAt: 'Now' },
];

export const MOCK_ORGS: Organization[] = [
  { id: 'org_1', name: 'Acme Corp', plan: 'enterprise', credits: 1250.00, usageCost: 450.20, status: 'active', createdAt: '2023-01-15' },
  { id: 'org_2', name: 'StartUp Inc', plan: 'pro', credits: 50.00, usageCost: 12.50, status: 'active', createdAt: '2023-06-20' },
  { id: 'org_3', name: 'Dev Test Account', plan: 'trial', credits: 5.00, usageCost: 0.00, status: 'suspended', createdAt: '2023-11-01' },
  { id: NIYA_ORG_ID, name: 'Niya Org', plan: 'pro', credits: 100.00, usageCost: 24.50, status: 'active', createdAt: '2023-12-01' },
];

export const MOCK_FILES: FileItem[] = [
    { id: 'f1', name: 'knowledge-base.pdf', size: '2.4 MB', type: 'PDF', uploadedAt: '2023-10-01' },
    { id: 'f2', name: 'script_v1.txt', size: '12 KB', type: 'TXT', uploadedAt: '2023-10-05' }
];

export const MOCK_TOOLS: ToolItem[] = [
    { id: 't1', name: 'bookAppointment', description: 'Books a slot in the calendar', type: 'function' },
    { id: 't2', name: 'transferToHuman', description: 'Transfers call to support line', type: 'transfer_call' }
];
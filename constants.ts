import { Assistant, CallLog, MetricData, Organization } from './types';

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
  // Niya Org Assistants (from Screenshot)
  {
    id: 'asst_niya_1',
    orgId: NIYA_ORG_ID,
    name: 'sales hepler',
    model: { provider: 'openai', model: 'gpt-3.5-turbo', systemPrompt: 'You are a sales helper.', temperature: 0.7 },
    voice: { provider: '11labs', voiceId: 'sarah' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-05T10:00:00Z',
  },
  {
    id: 'asst_niya_2',
    orgId: NIYA_ORG_ID,
    name: 'New Assistant',
    model: { provider: 'openai', model: 'gpt-4', systemPrompt: '', temperature: 0.7 },
    voice: { provider: 'vapi', voiceId: 'jennifer' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-06T14:00:00Z',
  },
  {
    id: 'asst_niya_3',
    orgId: NIYA_ORG_ID,
    name: 'Kylie',
    model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'I am Kylie.', temperature: 0.7 },
    voice: { provider: 'vapi', voiceId: 'kylie' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-07T09:30:00Z',
  },
  {
    id: 'asst_niya_4',
    orgId: NIYA_ORG_ID,
    name: 'Outbound',
    model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'Outbound sales.', temperature: 0.7 },
    voice: { provider: 'vapi', voiceId: 'matthew' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-08T11:15:00Z',
  },
  {
    id: 'asst_niya_5',
    orgId: NIYA_ORG_ID,
    name: 'Riley - Inbound',
    model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'Inbound support.', temperature: 0.7 },
    voice: { provider: 'vapi', voiceId: 'riley' },
    transcriber: { provider: 'deepgram', language: 'en' },
    createdAt: '2023-12-08T16:45:00Z',
  },
  // Other Org Assistants
  {
    id: 'asst_1',
    orgId: 'org_1', // Acme Corp
    name: 'Customer Support Agent',
    model: {
      provider: 'openai',
      model: 'gpt-4',
      systemPrompt: 'You are a helpful customer support agent for a tech company called VapiClone. Be polite, concise, and professional.',
      temperature: 0.7,
    },
    voice: {
      provider: '11labs',
      voiceId: 'sarah',
    },
    transcriber: {
      provider: 'deepgram',
      language: 'en',
    },
    createdAt: '2023-10-25T10:00:00Z',
  },
  {
    id: 'asst_2',
    orgId: 'org_1', // Acme Corp
    name: 'Inbound Sales Lead',
    model: {
      provider: 'anthropic',
      model: 'claude-3-haiku',
      systemPrompt: 'You are an aggressive but friendly sales representative. Qualify the lead by asking about their budget and timeline.',
      temperature: 0.5,
    },
    voice: {
      provider: 'playht',
      voiceId: 'larry',
    },
    transcriber: {
      provider: 'deepgram',
      language: 'en',
    },
    createdAt: '2023-11-01T14:30:00Z',
  },
  {
    id: 'asst_3',
    orgId: 'org_2', // StartUp Inc
    name: 'Booking Assistant',
    model: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      systemPrompt: 'You help schedule appointments.',
      temperature: 0.7,
    },
    voice: {
      provider: '11labs',
      voiceId: 'charlie',
    },
    transcriber: {
      provider: 'deepgram',
      language: 'en',
    },
    createdAt: '2023-11-10T09:00:00Z',
  },
];

export const MOCK_LOGS: CallLog[] = [
  { id: 'call_1', assistantId: 'asst_1', status: 'completed', duration: '2m 14s', cost: 0.12, startedAt: '2023-11-05 10:23 AM' },
  { id: 'call_2', assistantId: 'asst_1', status: 'completed', duration: '5m 01s', cost: 0.28, startedAt: '2023-11-05 11:45 AM' },
  { id: 'call_3', assistantId: 'asst_2', status: 'failed', duration: '0s', cost: 0.00, startedAt: '2023-11-06 09:12 AM' },
  { id: 'call_4', assistantId: 'asst_2', status: 'active', duration: '1m 20s', cost: 0.05, startedAt: 'Now' },
];

export const MOCK_ORGS: Organization[] = [
  { id: 'org_1', name: 'Acme Corp', plan: 'enterprise', credits: 1250.00, usageCost: 450.20, status: 'active', createdAt: '2023-01-15' },
  { id: 'org_2', name: 'StartUp Inc', plan: 'pro', credits: 50.00, usageCost: 12.50, status: 'active', createdAt: '2023-06-20' },
  { id: 'org_3', name: 'Dev Test Account', plan: 'trial', credits: 5.00, usageCost: 0.00, status: 'suspended', createdAt: '2023-11-01' },
  { id: NIYA_ORG_ID, name: 'Niya Org', plan: 'pro', credits: 100.00, usageCost: 24.50, status: 'active', createdAt: '2023-12-01' },
];
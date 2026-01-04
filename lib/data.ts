export type ViewState = 'overview' | 'assistants' | 'phone-numbers' | 'files' | 'tools' | 'logs';

export interface Assistant {
  id: string;
  name: string;
  model: string;
  voice: string;
  isActive: boolean;
  systemPrompt: string;
}

export const MOCK_ASSISTANTS: Assistant[] = [
  { id: 'asst_01', name: 'Dental Receptionist', model: 'gpt-4', voice: 'Sarah (11Labs)', isActive: true, systemPrompt: 'You are a helpful dental receptionist.' },
  { id: 'asst_02', name: 'Tech Support', model: 'claude-3-opus', voice: 'Matt (Deepgram)', isActive: false, systemPrompt: 'You are a tier 1 tech support agent.' },
  { id: 'asst_03', name: 'Sales Qualifier', model: 'gpt-3.5-turbo', voice: 'Rachel (11Labs)', isActive: true, systemPrompt: 'Qualify leads for solar panel installation.' },
];

export const MOCK_LOGS = [
  { id: 'call_992', status: 'completed', duration: '2m 14s', cost: 0.12, date: 'Just now', assistant: 'Dental Receptionist' },
  { id: 'call_991', status: 'completed', duration: '5m 01s', cost: 0.28, date: '10 mins ago', assistant: 'Sales Qualifier' },
  { id: 'call_990', status: 'failed', duration: '0s', cost: 0.00, date: '1 hour ago', assistant: 'Dental Receptionist' },
  { id: 'call_989', status: 'completed', duration: '1m 20s', cost: 0.05, date: '2 hours ago', assistant: 'Tech Support' },
  { id: 'call_988', status: 'completed', duration: '45s', cost: 0.02, date: 'Yesterday', assistant: 'Dental Receptionist' },
];

export const CHART_DATA = [
  { name: 'Mon', calls: 12, cost: 2.4 },
  { name: 'Tue', calls: 18, cost: 3.1 },
  { name: 'Wed', calls: 15, cost: 2.8 },
  { name: 'Thu', calls: 25, cost: 4.5 },
  { name: 'Fri', calls: 32, cost: 5.2 },
  { name: 'Sat', calls: 10, cost: 1.2 },
  { name: 'Sun', calls: 8, cost: 0.9 },
];

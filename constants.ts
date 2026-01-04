import { Assistant, CallLog, MetricData, Organization, FileItem, ToolItem } from './types';

// Vapi Private Key
export const VAPI_PRIVATE_KEY = '4535e480-b370-41d2-b275-bb85d4870aa4'; 
export const NIYA_ORG_ID = 'org_niya';

// Initialize with empty/zero data for production ready state
export const MOCK_METRICS: MetricData[] = Array.from({ length: 7 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
    calls: 0,
    minutes: 0,
    cost: 0,
  };
});

export const MOCK_ASSISTANTS: Assistant[] = [];

export const MOCK_LOGS: CallLog[] = [];

// Initialize with one default org for the user to log in
export const MOCK_ORGS: Organization[] = [
  { 
    id: NIYA_ORG_ID, 
    name: 'Niya Org', 
    plan: 'pro', 
    credits: 0.00, 
    usage_cost: 0.00, 
    status: 'active', 
    created_at: new Date().toISOString() 
  }
];

export const MOCK_FILES: FileItem[] = [];

export const MOCK_TOOLS: ToolItem[] = [];
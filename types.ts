
export interface Assistant {
  id: string;
  orgId: string; // Linked to Organization ID
  name: string;
  model: {
    provider: string;
    model: string;
    systemPrompt: string;
    temperature: number;
  };
  voice: {
    provider: string; // e.g., "11labs", "playht"
    voiceId: string;
  };
  transcriber: {
    provider: string; // e.g., "deepgram"
    language: string;
  };
  createdAt: string;
}

export interface CallLog {
  id: string;
  assistantId: string;
  status: 'completed' | 'failed' | 'active';
  duration: string;
  cost: number;
  startedAt: string;
  transcriptSummary?: string;
}

export interface MetricData {
  date: string;
  calls: number;
  minutes: number;
  cost: number;
}

export type ViewState = 'overview' | 'assistants' | 'phone-numbers' | 'logs' | 'files' | 'tools' | 'settings';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'dtmf' | 'end_call' | 'transfer_call';
}

export interface Organization {
  id: string;
  name: string;
  email?: string; // Contact/Login Email
  password?: string; // Stored password for admin/recovery
  role?: 'user' | 'admin'; // Access Level
  plan: 'trial' | 'pro' | 'enterprise';
  credits: number;
  usage_cost: number;
  status: 'active' | 'suspended';
  created_at: string;
  members?: string[]; // List of invited emails
}
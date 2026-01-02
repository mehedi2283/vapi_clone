import { Assistant } from '../types';
import { MOCK_ASSISTANTS } from '../constants';

const handleVapiError = async (response: Response) => {
  try {
    const errorData = await response.json();
    const message = errorData.message || errorData.error || response.statusText;
    throw new Error(message);
  } catch (e: any) {
    if (e.message && e.message !== 'Unexpected end of JSON input') {
      throw e;
    }
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
};

export const fetchVapiAssistants = async (apiKey: string): Promise<Assistant[]> => {
  if (!apiKey) {
    console.warn("Vapi API Key is missing, using mocks.");
    return MOCK_ASSISTANTS;
  }
  
  try {
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn("Vapi API request failed, falling back to mock data:", response.statusText);
      return MOCK_ASSISTANTS;
    }

    const data = await response.json();
    
    // Map Vapi response to our Assistant type
    return data.map((item: any) => {
      let systemPrompt = '';
      if (item.model?.messages) {
        const sysMsg = item.model.messages.find((m: any) => m.role === 'system');
        if (sysMsg) systemPrompt = sysMsg.content;
      }
      if (!systemPrompt && item.model?.systemPrompt) {
        systemPrompt = item.model.systemPrompt;
      }

      return {
        id: item.id,
        orgId: item.orgId,
        name: item.name || 'Untitled Assistant',
        model: {
          provider: item.model?.provider || 'unknown',
          model: item.model?.model || 'unknown',
          systemPrompt: systemPrompt || '',
          temperature: item.model?.temperature || 0.7,
        },
        voice: {
          provider: item.voice?.provider || 'unknown',
          voiceId: item.voice?.voiceId || 'unknown',
        },
        transcriber: {
          provider: item.transcriber?.provider || 'unknown',
          language: item.transcriber?.language || 'en',
        },
        createdAt: item.createdAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.warn("Failed to fetch Vapi assistants (Network/CORS), using mocks.", error);
    return MOCK_ASSISTANTS;
  }
};

export const createVapiAssistant = async (apiKey: string, assistant: Assistant): Promise<Assistant | null> => {
  if (!apiKey || apiKey === 'demo') {
      return { ...assistant, id: `asst_mock_${Date.now()}` };
  }

  const payload = {
    name: assistant.name,
    transcriber: {
      provider: assistant.transcriber.provider,
      language: assistant.transcriber.language,
    },
    model: {
      provider: assistant.model.provider,
      model: assistant.model.model,
      messages: [
        {
          role: 'system',
          content: assistant.model.systemPrompt
        }
      ],
      temperature: assistant.model.temperature,
    },
    voice: {
      provider: assistant.voice.provider,
      voiceId: assistant.voice.voiceId,
    },
    firstMessage: "Hello! How can I help you today?",
    serverMessages: ["function-call", "hang", "end-of-call-report"],
    clientMessages: ["transcript", "hang", "function-call", "voice-input", "speech-update", "metadata", "conversation-update", "model-output"]
  };

  try {
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       console.warn("Create failed, falling back to local mock");
       return { ...assistant, id: `asst_local_${Date.now()}` };
    }

    const data = await response.json();
    
    return {
      id: data.id,
      orgId: data.orgId,
      name: data.name || assistant.name,
      model: {
        provider: data.model?.provider || assistant.model.provider,
        model: data.model?.model || assistant.model.model,
        systemPrompt: data.model?.messages?.find((m: any) => m.role === 'system')?.content || assistant.model.systemPrompt,
        temperature: data.model?.temperature || assistant.model.temperature,
      },
      voice: {
        provider: data.voice?.provider || assistant.voice.provider,
        voiceId: data.voice?.voiceId || assistant.voice.voiceId,
      },
      transcriber: {
        provider: data.transcriber?.provider || assistant.transcriber.provider,
        language: data.transcriber?.language || assistant.transcriber.language,
      },
      createdAt: data.createdAt || new Date().toISOString(),
    };

  } catch (error) {
    console.error("Error creating assistant:", error);
    return { ...assistant, id: `asst_offline_${Date.now()}` };
  }
};

export const updateVapiAssistant = async (apiKey: string, assistant: Assistant): Promise<Assistant> => {
  if (!apiKey || apiKey === 'demo') {
      return assistant;
  }

  const payload = {
    name: assistant.name,
    transcriber: {
      provider: assistant.transcriber.provider,
      language: assistant.transcriber.language,
    },
    model: {
      provider: assistant.model.provider,
      model: assistant.model.model,
      messages: [
        {
          role: 'system',
          content: assistant.model.systemPrompt
        }
      ],
      temperature: assistant.model.temperature,
    },
    voice: {
      provider: assistant.voice.provider,
      voiceId: assistant.voice.voiceId,
    },
    firstMessage: "Hello! How can I help you today?",
    serverMessages: ["function-call", "hang", "end-of-call-report"],
    clientMessages: ["transcript", "hang", "function-call", "voice-input", "speech-update", "metadata", "conversation-update", "model-output"]
  };

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.warn("Update failed, using local version");
        return assistant;
    }

    const data = await response.json();
    
    return {
      ...assistant,
      name: data.name || assistant.name,
      model: {
        ...assistant.model,
        provider: data.model?.provider || assistant.model.provider,
        model: data.model?.model || assistant.model.model,
        systemPrompt: data.model?.messages?.find((m: any) => m.role === 'system')?.content || assistant.model.systemPrompt,
        temperature: data.model?.temperature || assistant.model.temperature,
      },
      voice: {
        ...assistant.voice,
        provider: data.voice?.provider || assistant.voice.provider,
        voiceId: data.voice?.voiceId || assistant.voice.voiceId,
      },
      transcriber: {
        ...assistant.transcriber,
        provider: data.transcriber?.provider || assistant.transcriber.provider,
        language: data.transcriber?.language || assistant.transcriber.language,
      },
    };
  } catch (error) {
    console.error("Error updating assistant:", error);
    return assistant;
  }
};

export const deleteVapiAssistant = async (apiKey: string, assistantId: string): Promise<void> => {
  if (!apiKey || apiKey === 'demo') return;

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
       console.warn("Delete failed on server, proceeding with local delete");
    }
    
  } catch (error) {
    console.error("Error deleting assistant:", error);
  }
};

// --- Secure Link Generation Utilities ---

const ENCRYPTION_KEY = "vapi_dashboard_secure_link_salt_2024_v1";

// Generates an encrypted-looking token containing the orgId and Name
export const generateSecureToken = (org: { id: string, name: string }): string => {
  try {
    // We use encodeURIComponent to handle UTF-8 chars safely for btoa
    const payload = JSON.stringify({ 
      id: org.id, 
      nm: org.name,
      ts: Date.now(),
      v: 2 
    });
    
    const encodedPayload = encodeURIComponent(payload);

    // Simple XOR Cipher
    // We XOR the char codes of the encoded ASCII string
    const encrypted = encodedPayload.split('').map((c, i) => 
      c.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
    
    // Convert to Base64 (Input is all ASCII now because of encodeURIComponent)
    const base64 = btoa(String.fromCharCode(...encrypted));
    
    // Make URL safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (error) {
    console.error("Token generation failed", error);
    return '';
  }
};

// Parses the token to retrieve the orgId and Name
export const parseSecureToken = (token: string): { id: string, nm?: string } | null => {
  try {
    // Restore Base64 padding and chars
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const encryptedCodes = atob(base64).split('').map(c => c.charCodeAt(0));
    
    // Reverse XOR Cipher
    const decryptedEncodedString = encryptedCodes.map((c, i) => 
      String.fromCharCode(c ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length))
    ).join('');
    
    const payload = decodeURIComponent(decryptedEncodedString);
    const data = JSON.parse(payload);
    
    return {
        id: data.id,
        nm: data.nm 
    };
  } catch (error) {
    console.error("Token parsing failed", error);
    return null;
  }
};
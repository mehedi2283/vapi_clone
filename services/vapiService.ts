import { Assistant } from '../types';

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
    console.warn("Vapi API Key is missing");
    return [];
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
      await handleVapiError(response);
    }

    const data = await response.json();
    
    // Map Vapi response to our Assistant type
    return data.map((item: any) => {
      // Attempt to extract system prompt
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
        orgId: item.orgId, // We will override this in the App to match Niya Org context
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
    console.error("Failed to fetch Vapi assistants:", error);
    return [];
  }
};

export const createVapiAssistant = async (apiKey: string, assistant: Assistant): Promise<Assistant | null> => {
  if (!apiKey) {
    console.error("API Key missing");
    throw new Error("API Key is missing");
  }

  // Construct payload according to Vapi API documentation
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
      await handleVapiError(response);
    }

    const data = await response.json();
    
    // Map back to our Assistant type
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
    throw error;
  }
};

export const updateVapiAssistant = async (apiKey: string, assistant: Assistant): Promise<Assistant> => {
  if (!apiKey) throw new Error("API Key is missing");

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
      await handleVapiError(response);
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
    throw error;
  }
};

export const deleteVapiAssistant = async (apiKey: string, assistantId: string): Promise<void> => {
  if (!apiKey) throw new Error("API Key is missing");

  console.log(`Attempting to delete assistant: ${assistantId}`);

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
        // Content-Type is not typically needed for DELETE and can sometimes cause issues if body is empty
      }
    });

    if (!response.ok) {
      await handleVapiError(response);
    }
    
    console.log(`Successfully deleted assistant: ${assistantId}`);
  } catch (error) {
    console.error("Error deleting assistant:", error);
    throw error;
  }
};
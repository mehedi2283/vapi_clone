import { GoogleGenAI, Modality } from "@google/genai";
import { ChatMessage } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSystemPrompt = async (name: string, goal: string): Promise<string> => {
  if (!apiKey) return "API Key missing. Please provide a valid API key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert Voice AI engineer. Create a concise but effective system prompt for a voice assistant named "${name}" whose primary goal is: "${goal}".
      
      The prompt should:
      1. Define the persona clearly.
      2. Set constraints (keep answers short for voice latency).
      3. Be ready to copy-paste into a configuration field.
      
      Return ONLY the prompt text, no markdown formatting or explanations.`,
    });
    return response.text?.trim() || "Failed to generate prompt.";
  } catch (error) {
    console.error("Error generating prompt:", error);
    return "Error generating prompt. Please try again.";
  }
};

export const chatWithAssistant = async (
  systemPrompt: string,
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  if (!apiKey) return "I can't respond without an API key.";

  try {
    const contents = history
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 150,
      }
    });

    return response.text?.trim() || "...";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Sorry, I encountered an error processing that request.";
  }
};

// --- Audio Helper Functions ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<void> => {
  if (!apiKey) {
    console.warn("No API Key provided for TTS");
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1,
    );
    
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);
    source.start();

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};
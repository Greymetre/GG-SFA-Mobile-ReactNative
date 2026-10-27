import axiosClient from '../AxiosClient';
import { API_ENDPOINT } from '../ApiUrls';

// CRM Assistant: the same chatbot as the web panel (backend App\Services\Chatbot), read only.

export type ChatButton = {
  label: string;
  intent: string;
  params?: Record<string, any>;
  refine?: boolean; // "change period / only me / whole team" chips, shown apart
};

export type ChatTable = {
  head: string[];
  rows: (string | number | null)[][];
};

export type ChatMessage = {
  sender: 'user' | 'bot';
  id?: number;
  text: string;
  table?: ChatTable | null;
  buttons?: ChatButton[];
  isError?: boolean;
};

export type ChatHistory = {
  messages: ChatMessage[];
  suggestions: ChatButton[];
};

/** Thrown when the user's role does not have chatbot_access */
export class ChatbotNoAccessError extends Error {}

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || (typeof error === 'string' ? error : '') || fallback;

export const getChatHistory = async (): Promise<ChatHistory> => {
  try {
    const response = await axiosClient.get(API_ENDPOINT.CHATBOT_HISTORY);
    return {
      messages: response.data?.messages ?? [],
      suggestions: response.data?.suggestions ?? [],
    };
  } catch (error: any) {
    if (error?.response?.status === 403) {
      throw new ChatbotNoAccessError(errorMessage(error, 'AI Assistant aapke account ke liye chalu nahi hai.'));
    }
    throw error;
  }
};

export const sendChatMessage = async (
  message: string,
  button?: ChatButton,
): Promise<ChatMessage> => {
  try {
    const response = await axiosClient.post(API_ENDPOINT.CHATBOT_MESSAGE, {
      message,
      intent: button?.intent ?? null,
      params: button?.params ?? {},
    });
    const data = response?.data;
    if (data?.status === 'success') {
      return { sender: 'bot', id: data.id, text: data.text, table: data.table, buttons: data.buttons ?? [] };
    }
    return { sender: 'bot', text: data?.message || 'Kuch gadbad hui, dobara try kijiye.', isError: true };
  } catch (error: any) {
    if (error?.response?.status === 403) {
      throw new ChatbotNoAccessError(errorMessage(error, 'AI Assistant aapke account ke liye chalu nahi hai.'));
    }
    return { sender: 'bot', text: 'Server se jawab nahi aaya, internet check karke dobara try kijiye.', isError: true };
  }
};

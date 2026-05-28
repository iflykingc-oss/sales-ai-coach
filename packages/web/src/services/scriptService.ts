import { api } from './api';

interface GenerateScriptParams {
  sessionId: string;
  content: string;
  inputType?: string;
  industry?: string;
  frameworks?: string[];  // Analytical framework IDs to apply
}

export async function generateScript(params: GenerateScriptParams) {
  // 1. Save user message
  await api.post(`/sessions/${params.sessionId}/messages`, {
    content: params.content,
    role: 'USER',
    inputType: params.inputType || 'TEXT',
  });

  // 2. Generate script
  const response = await api.post('/scripts/generate', {
    input: params.content,
    inputType: params.inputType || 'TEXT',
    industry: params.industry,
    sessionId: params.sessionId,
    frameworks: params.frameworks || [],
  });

  return response as unknown as { success: boolean; data: any; scriptIds?: string[] };
}

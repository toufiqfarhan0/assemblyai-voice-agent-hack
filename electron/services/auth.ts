export interface TokenResponse {
  token: string;
  expiresInSeconds: number;
}

export async function mintVoiceAgentToken(): Promise<TokenResponse> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in .env');
  }

  const response = await fetch(
    'https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=900',
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AssemblyAI token request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as { token?: string; expires_in_seconds?: number };
  if (!payload.token) {
    throw new Error('AssemblyAI returned no temporary token');
  }

  return {
    token: payload.token,
    expiresInSeconds: payload.expires_in_seconds ?? 300,
  };
}

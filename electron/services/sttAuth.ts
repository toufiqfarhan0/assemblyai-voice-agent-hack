export interface STTTokenResponse {
  token: string;
}

export async function mintStreamingSTTToken(): Promise<STTTokenResponse> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is not configured in .env');
  }

  const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expires_in: 3600,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AssemblyAI STT token request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { token: string };
  return {
    token: data.token,
  };
}

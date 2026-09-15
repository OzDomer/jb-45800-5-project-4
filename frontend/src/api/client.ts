const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface JobResponse {
  jobId: string;
  status: 'pending' | 'done' | 'failed';
  label: string | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  error: string | null;
  imageUrl: string;
}

export function getApiOrigin(): string {
  return new URL(API_URL, window.location.href).origin;
}

export async function createPrediction(image: File): Promise<JobResponse> {
  const form = new FormData();
  form.append('image', image);

  const response = await fetch(`${API_URL}/predictions`, { method: 'POST', body: form });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message ?? 'The upload failed, please try again');
  }
  return body;
}

export async function getPrediction(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${API_URL}/predictions/${jobId}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message ?? 'Could not load the prediction');
  }
  return body;
}

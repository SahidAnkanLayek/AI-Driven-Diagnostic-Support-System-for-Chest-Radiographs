/**
 * API client for chest X-ray prediction backend.
 */

export interface PredictionResponse {
  labels: string[];
  scores: number[];
  top_label: string;
  top_score: number;
  heatmap_png_base64: string;
}

/**
 * Send an image to the backend for chest X-ray classification.
 * 
 * @param file - Image file (JPEG, PNG)
 * @returns Prediction results including labels, scores, and Grad-CAM heatmap
 */
export async function predictImage(file: File): Promise<PredictionResponse> {
  const form = new FormData();
  form.append("file", file);
  
  const baseUrl = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const res = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    body: form,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Predict failed: ${res.status} ${text}`);
  }
  
  return res.json();
}

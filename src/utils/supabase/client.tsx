// Local-only: we are not using Supabase. This module only exports API utils.

// API base URL for our Hono server
// Use local server in development, Supabase in production
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
export const API_BASE_URL = isDevelopment 
  ? '/make-server-6d46752d'  // Use relative URL so Vite proxy handles it
  : '/make-server-6d46752d'

// Helper function to make authenticated API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout (increased for HTTPS handshake)
  // Throttle logs using a global DEBUG flag or environment variable if needed
  const DEBUG = false; // Set to true for debugging API calls

  try {
    if (DEBUG) console.log(`Making API call to: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (DEBUG) console.log(`API call response status: ${response.status}`);

    if (!response.ok) {
      let errorText = `HTTP ${response.status}`;
      let errorHint: string | undefined;
      try {
        // Read the response body as text first, then try to parse as JSON
        const responseText = await response.text();
        try {
          const errorData = JSON.parse(responseText);
          errorText = errorData.error || errorText;
          errorHint = errorData.hint;
        } catch {
          // If JSON parsing fails, use the text itself
          errorText = responseText || errorText;
        }
      } catch {
        // If reading fails, use status text
        errorText = response.statusText || `HTTP ${response.status}`;
      }
      const error = new Error(errorText) as Error & { hint?: string };
      if (errorHint) {
        error.hint = errorHint;
      }
      throw error;
    }

    const data = await response.json()
    if (DEBUG) console.log('API call successful:', data);
    return data
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('API call failed:', error);
    console.error('API URL attempted:', `${API_BASE_URL}${endpoint}`);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - please try again')
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // More specific error message
      const errorMsg = error.message || 'Network error';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
        throw new Error(`Network error - Could not reach API endpoint. Please ensure the Supabase edge function is deployed and accessible at ${API_BASE_URL}`)
      }
      throw new Error(`Network error - ${errorMsg}`)
    }
    throw error
  }
}
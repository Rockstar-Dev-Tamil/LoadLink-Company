/**
 * LoadLink Assistant Logic
 * Ported from vanilla JS to TypeScript
 */

export const SYSTEM_PROMPT = `You are LoadLink Assistant, an expert logistics support agent for SME freight operations. You have deep knowledge of:
- Shipment booking flows (material type, truck selection, volume/weight)
- Live tracking interpretation (ETA, route status, driver contact)
- Payment and billing queries (settlement timelines, invoice disputes, payment status)
- Sustainability metrics (CO2 saved, fuel efficiency, distance optimization)
- Troubleshooting (delayed shipments, failed payments, booking errors)

Tone: Professional, concise, helpful. Use bullet points for steps. Always end with a follow-up question if the issue isn't fully resolved.

NEVER say "I don't know." Instead say: "Let me check that for you" and guide the user to the relevant dashboard section.

Current Context:
- Active Shipments: {activeShipments}
- Pending Payments: Rs {pendingPayments}
- User Role: {userRole}`;

export const LOADLINK_CONTEXT = `LoadLink app details:
- Dashboard: Shows fleet health, pending bookings, and ESG (sustainability) metrics.
- Active Shipments: Live tracking with map integration. Supports multi-shipment view with distinct colors.
- Book Shipment: Allows SMEs to match with nearby trucks and book instantly.
- Payments: Complete billing history and settlement status for each shipment.
- Sustainability: Real-time CO2 savings, fuel efficiency, and distance optimization reporting.
- Support: Integrated chat with drivers and operations support.
- Navigation: Direct handoff to maps for turn-by-turn guidance.
Answer in very simple English. Avoid repeating yourself. If you already provided a specific solution, offer more detail or check if the user needs further clarification instead of stating the same steps.`;

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL as string | undefined;
// Avoid noisy localhost connection errors unless the user explicitly configures an endpoint.
const ENABLE_OLLAMA = import.meta.env.VITE_ENABLE_OLLAMA === 'true' && !!OLLAMA_BASE_URL;
const OLLAMA_URL = OLLAMA_BASE_URL ? `${OLLAMA_BASE_URL}/api/generate` : '';
const OLLAMA_TAGS_URL = OLLAMA_BASE_URL ? `${OLLAMA_BASE_URL}/api/tags` : '';

// RegEx Patterns
const GREETING_PATTERNS = [/hi+/i, /hello+/i, /hey+/i, /namaste+/i, /help+/i];
const IDENTITY_PATTERNS = [/who are (you|yo)/i, /your name/i, /what are you/i, /who r u/i];
const ABOUT_PATTERNS = [/about loadlink/i, /what is (this|it)/i, /what can you do/i, /capabilities/i];
const ROUTE_BETWEEN_PATTERN = /between\s+([a-z\s.-]+?)\s+and\s+([a-z\s.-]+?)\s*$/i;
const ROUTE_FROM_TO_PATTERN = /from\s+([a-z\s.-]+?)\s+to\s+([a-z\s.-]+?)\s*$/i;
const ETA_QUERY_PATTERNS = [/\bwhat is (my )?eta\b/i, /\beta\b/i, /\barrival time\b/i, /\bhow long\b/i];

export interface ChatState {
  pendingIntent: string | null;
  pendingLabel: string | null;
  lastRoute: [string, string] | null;
}

export const getDeterministicReply = (
  question: string,
  state: ChatState,
): { reply: string; newState: ChatState } => {
  const normalized = question.toLowerCase().replace(/[?!.,:;]+/g, "").trim();
  let newState = { ...state };

  // 1. Greetings and Identity
  if (GREETING_PATTERNS.some(p => p.test(normalized))) {
    return {
      reply: "Hi! I am the LoadLink Assistant. I can help with delivery tracking, ETA, truck booking, or route issues. What do you need?",
      newState: { ...newState, pendingIntent: null }
    };
  }

  if (IDENTITY_PATTERNS.some(p => p.test(normalized))) {
    return {
      reply: "I'm the LoadLink Assistant, your 24/7 logistics partner. I help SMEs manage shipments, track trucks, and optimize routes.",
      newState
    };
  }

  if (ABOUT_PATTERNS.some(p => p.test(normalized))) {
    return {
      reply: "LoadLink is a platform for MSME logistics. I can:\n- Track your fleet live\n- Help you book new shipments\n- Show ETA and route details\n- Track your sustainability (CO2) metrics",
      newState
    };
  }

  // 2. Extract Route
  const routeMatch = normalized.match(ROUTE_FROM_TO_PATTERN) || normalized.match(ROUTE_BETWEEN_PATTERN);
  if (routeMatch) {
    const route: [string, string] = [routeMatch[1].trim(), routeMatch[2].trim()];
    newState.lastRoute = route;

    if (normalized.includes("book") || normalized.includes("need")) {
      return {
        reply: `To book a truck from ${route[0]} to ${route[1]}:\n1. Go to Bookings.\n2. Tap "New Trip".\n3. Enter addresses.\n4. Confirm and wait for a driver.`,
        newState: { ...newState, pendingIntent: null }
      };
    }

    return {
      reply: `For the trip from ${route[0]} to ${route[1]}:\n1. Open the trip in LoadLink.\n2. See Drive Time for time left.\n3. Arrives By shows expected time.\n4. Watch the truck live on the map.`,
      newState: { ...newState, pendingIntent: null }
    };
  }

  // 3. ETA logic
  if (ETA_QUERY_PATTERNS.some(p => p.test(normalized))) {
    if (newState.lastRoute) {
      return {
        reply: `For your trip to ${newState.lastRoute[1]}:\nCheck 'Arrives By' in the trip details. Drive Time shows remaining hours.`,
        newState
      };
    }
    newState.pendingIntent = "eta_trip";
    return {
      reply: "I can help with ETA. Please tell me the route (e.g., Chennai to Madurai) or say 'current trip'.",
      newState
    };
  }

  // 4. Tracking
  if (normalized.includes("track") || normalized.includes("where")) {
    return {
      reply: "To track: Open 'Tracking', tap a trip, and watch the truck icon on the map. Use the filters to narrow the list.",
      newState
    };
  }

  // 5. Breakdown
  if (normalized.includes("breakdown") || normalized.includes("stuck")) {
    return {
      reply: "Breakdown help:\n1. Stop safely.\n2. Keep app open if possible.\n3. Inform your dispatcher.\n4. ETA will update when you move again.",
      newState
    };
  }

  // 6. Clarification Fallback
  return {
    reply: "Tell me more in simple words. Example: 'track truck', 'ETA for trip', or 'how to book'.",
    newState
  };
};

export async function checkOllama(): Promise<{ online: boolean; model: string | null }> {
  if (!ENABLE_OLLAMA) return { online: false, model: null };
  try {
    const res = await fetch(OLLAMA_TAGS_URL);
    if (!res.ok) return { online: false, model: null };
    const data = await res.json();
    const model = data.models?.[0]?.name || null;
    return { online: !!model, model };
  } catch {
    return { online: false, model: null };
  }
}

export async function askAI(
  question: string,
  model: string,
  context: { activeShipments: number; pendingPayments: number; userRole: string },
  history: { role: 'assistant' | 'user'; text: string }[] = []
): Promise<string> {
  if (!ENABLE_OLLAMA) {
    throw new Error('Ollama is disabled.');
  }

  const interpolatedSystem = SYSTEM_PROMPT
    .replace('{activeShipments}', context.activeShipments.toString())
    .replace('{pendingPayments}', context.pendingPayments.toLocaleString())
    .replace('{userRole}', context.userRole);

  const historyPrompt = history.map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.text}`).join('\n');

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: interpolatedSystem,
      prompt: `${LOADLINK_CONTEXT}\n\nChat History:\n${historyPrompt}\n\nUser: ${question}`,
      stream: false
    })
  });
  const data = await res.json();
  return data.response.trim();
}

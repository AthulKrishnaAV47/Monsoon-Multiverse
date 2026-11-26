export const DEFAULT_API_URL = "http://localhost:8000";

function normalizeBase(apiBaseUrl) {
  return (apiBaseUrl || DEFAULT_API_URL).trim().replace(/\/+$/, "");
}

export async function fetchHealth(apiBaseUrl) {
  const res = await fetch(`${normalizeBase(apiBaseUrl)}/health`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

export async function runSimulate(apiBaseUrl, { initStates, doySincos, steps, perturbation }) {
  const res = await fetch(`${normalizeBase(apiBaseUrl)}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      init_states: initStates,
      doy_sincos: doySincos,
      steps,
      perturbation: perturbation ?? null,
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Simulate failed (${res.status}): ${msg}`);
  }
  return res.json();
}

export async function fetchBundledWindow(filename) {
  const res = await fetch(`/samples/${encodeURIComponent(filename)}`);
  if (!res.ok) {
    throw new Error(`Failed to load bundled window ${filename} (${res.status})`);
  }
  return res.json();
}

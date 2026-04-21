type ProviderState = {
  failures: number;
  openUntil: number;
};

const providerStates = new Map<string, ProviderState>();
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_OPEN_MS = 45_000;

export function circuitKey(tier: string, backend: string) {
  return `${tier}:${backend}`;
}

export function isCircuitOpen(key: string) {
  const s = providerStates.get(key);
  return Boolean(s && s.openUntil > Date.now());
}

export function markProviderSuccess(key: string) {
  providerStates.set(key, { failures: 0, openUntil: 0 });
}

export function markProviderFailure(key: string) {
  const previous = providerStates.get(key) ?? { failures: 0, openUntil: 0 };
  const failures = previous.failures + 1;
  const openUntil =
    failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD ? Date.now() + CIRCUIT_BREAKER_OPEN_MS : 0;
  providerStates.set(key, { failures, openUntil });
}

export function getCircuitStates() {
  return new Map(providerStates);
}

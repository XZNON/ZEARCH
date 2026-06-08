// Tiny scoped logger: createLogger('store') -> (...args) => console.log('[store]', ...args)

export function createLogger(scope: string) {
  return (...args: unknown[]): void => console.log(`[${scope}]`, ...args);
}

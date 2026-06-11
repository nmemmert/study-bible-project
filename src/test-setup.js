import '@testing-library/jest-dom';

// Node 22+ defines experimental localStorage/sessionStorage globals that are
// undefined unless --localstorage-file is passed. Vitest's jsdom environment
// skips copying window keys that already exist on the Node global, so jsdom's
// storage objects get shadowed. Bridge them from the raw jsdom instance.
const jsdomWindow = globalThis.jsdom?.window;
if (jsdomWindow) {
  for (const key of ['localStorage', 'sessionStorage']) {
    if (typeof globalThis[key] === 'undefined' && jsdomWindow[key]) {
      Object.defineProperty(globalThis, key, {
        value: jsdomWindow[key],
        writable: true,
        configurable: true,
      });
    }
  }
}

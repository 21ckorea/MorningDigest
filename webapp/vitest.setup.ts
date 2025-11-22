import '@testing-library/jest-dom/vitest';

class StorageMock {
  private store: Record<string, string> = {};

  getItem(key: string) {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value;
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new StorageMock(),
});

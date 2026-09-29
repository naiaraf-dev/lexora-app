// setup global de los tests unitarios (vitest + jsdom)

// Node 25 trae su propio localStorage global (experimental) que, sin --localstorage-file,
// queda sin metodos y pisa al de jsdom. Si pasa eso, se reemplaza por uno en memoria.
class MemoryStorage implements Storage {
  private datos = new Map<string, string>();
  get length() { return this.datos.size; }
  clear() { this.datos.clear(); }
  getItem(clave: string) { return this.datos.has(clave) ? this.datos.get(clave)! : null; }
  key(indice: number) { return [...this.datos.keys()][indice] ?? null; }
  removeItem(clave: string) { this.datos.delete(clave); }
  setItem(clave: string, valor: string) { this.datos.set(clave, String(valor)); }
}

for (const nombre of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[nombre]?.getItem !== 'function') {
    Object.defineProperty(globalThis, nombre, { value: new MemoryStorage(), configurable: true });
  }
}

// jsdom no implementa matchMedia (lo usa ngx-sonner)
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

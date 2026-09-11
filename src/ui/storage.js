/**
 * localStorage with the sharp edges removed.
 *
 * Reads and writes throw in a private window, when site data is blocked, and
 * inside some embedded previews. The upstream game guarded only the presence
 * of the API, so a quota or security error still crashed the page. Here every
 * access is guarded and falls back to an in-memory store, so play continues
 * and only persistence is lost.
 */
export function createStorage(namespace = 'gridshift', backing = globalThis.localStorage) {
  const memory = new Map();
  let usable = false;
  try {
    const probe = `${namespace}:probe`;
    backing.setItem(probe, '1');
    backing.removeItem(probe);
    usable = true;
  } catch {
    usable = false;
  }

  const key = (name) => `${namespace}:${name}`;

  return {
    get persistent() {
      return usable;
    },
    read(name, fallback = null) {
      try {
        const raw = usable ? backing.getItem(key(name)) : memory.get(key(name));
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    write(name, value) {
      const raw = JSON.stringify(value);
      try {
        if (usable) backing.setItem(key(name), raw);
        else memory.set(key(name), raw);
        return true;
      } catch {
        memory.set(key(name), raw);
        return false;
      }
    },
    remove(name) {
      try {
        if (usable) backing.removeItem(key(name));
      } catch { /* ignore */ }
      memory.delete(key(name));
    },
  };
}

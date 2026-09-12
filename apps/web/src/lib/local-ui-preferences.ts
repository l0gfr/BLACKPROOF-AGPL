// Non-sensitive UI state only. This database never opens or migrates case storage.
export type Theme = "dark" | "light";
const DATABASE = "blackproof-ui-preferences";

function themePreference(write?: Theme): Promise<Theme> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("preferences"); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("UI preferences are unavailable."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      try {
        const transaction = db.transaction("preferences", write ? "readwrite" : "readonly");
        const store = transaction.objectStore("preferences");
        const operation = write ? store.put(write, "theme") : store.get("theme");
        let theme: Theme = "dark";
        operation.onsuccess = () => { theme = write ?? (operation.result === "light" ? "light" : "dark"); };
        transaction.oncomplete = () => { db.close(); resolve(theme); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      } catch (error) { db.close(); reject(error); }
    };
  });
}

export const readThemePreference = (): Promise<Theme> => themePreference();
export function writeThemePreference(theme: Theme): Promise<Theme> {
  if (theme !== "dark" && theme !== "light") return Promise.reject(new Error("Invalid UI theme."));
  return themePreference(theme);
}

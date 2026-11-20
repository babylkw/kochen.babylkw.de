import { z } from "zod";
import { dateKey, type Kitchen, type Change, afterChange } from "./kitchen";
import { examples, recipeSchema, titleKey, type RecipeInput } from "./recipes";

const localRecipe = recipeSchema.extend({ id: z.string().uuid() });
const meal = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d\d-\d\d$/).refine(s => dateKey(new Date(s+"T12:00:00")) === s),
  recipeId: z.string().min(1).max(128),
  servings: z.number().int().min(1).max(150),
});
const snapshot = z.object({
  recipes: z.array(localRecipe),
  kitchen: z.object({ meals: z.array(meal), checks: z.array(z.string().min(1).max(4000)) }),
  favorites: z.array(z.string().min(1).max(128)),
});
const backup = z.object({ format: z.literal("julia-kochstudio"), version: z.literal(1), data: snapshot });
export type DeviceBook = z.infer<typeof snapshot>;
export const emptyBook = (): DeviceBook => ({ recipes: [], kitchen: { meals: [], checks: [] }, favorites: [] });

function firstBook(): DeviceBook {
  const book = emptyBook();
  try {
    const legacy:unknown = JSON.parse(localStorage.getItem("tisch-tafel-favoriten-v1") || "[]");
    if (Array.isArray(legacy)) book.favorites = legacy.filter((v):v is string => typeof v === "string");
  } catch { /* Device storage may be unavailable in private mode. */ }
  return book;
}

let database: Promise<IDBDatabase> | undefined;
function openDevice(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("julia-kochstudio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("kochbuch");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
  }).catch(error => { database = undefined; throw error; });
  return database;
}

// One read/write transaction also serializes edits made in other tabs.
export async function readOrUpdate(update?: (book: DeviceBook) => DeviceBook): Promise<DeviceBook> {
  const db = await openDevice();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kochbuch", update ? "readwrite" : "readonly");
    const store = tx.objectStore("kochbuch");
    const read = store.get("familie");
    let result: DeviceBook, failure: unknown;
    read.onsuccess = () => {
      try {
        result = read.result === undefined ? firstBook() : snapshot.parse(read.result);
        if (update) { result = update(result); store.put(result, "familie"); }
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => {
      const error = failure || tx.error;
      reject(error instanceof DOMException && error.name === "QuotaExceededError"
        ? new Error("Der Gerätespeicher ist voll. Bitte Platz schaffen und erneut speichern.")
        : error || new Error("Der Browser konnte die Änderung nicht speichern."));
    };
  });
}

export function changePlan(book:DeviceBook, change:Change): DeviceBook {
  return { ...book, kitchen: afterChange(book.kitchen as Kitchen, change) };
}
export function addDeviceRecipe(book:DeviceBook, input:RecipeInput) {
  const recipe = recipeSchema.parse(input);
  const existing = [...book.recipes,...examples].find(r=>titleKey(r.title)===titleKey(recipe.title));
  if (existing) {
    if (JSON.stringify(recipeSchema.parse(existing)) !== JSON.stringify(recipe)) {
      throw new Error("Ein anderes Rezept hat bereits diesen Titel. Bitte gib deinem Rezept einen eigenen Namen.");
    }
    return { book, recipe: existing };
  }
  const saved = { ...recipe, id: crypto.randomUUID() };
  return { book: { ...book, recipes: [saved,...book.recipes] }, recipe: saved };
}
export function serializeBackup(book:DeviceBook):string {
  return JSON.stringify({ format: "julia-kochstudio", version: 1, data:book });
}
export function parseBackup(text:string):DeviceBook {
  try {
    const data = backup.parse(JSON.parse(text)).data;
    const ids = new Set([...examples,...data.recipes].map(r=>r.id));
    if (data.kitchen.meals.some(m=>!ids.has(m.recipeId))) throw new Error();
    return data;
  } catch { throw new Error("Bitte eine gültige Sicherungsdatei von Julia Kochstudio auswählen. Für eingeplante gemeinsame Rezepte muss dieselbe Rezept-ID im Kochbuch vorhanden sein."); }
}
export function mergeBackup(current:DeviceBook, incoming:DeviceBook):DeviceBook {
  function merge<T extends {id:string}>(a:T[], b:T[]) {
    const items = new Map(a.map(x=>[x.id,x]));
    for (const item of b) if (!items.has(item.id)) items.set(item.id,item);
    return [...items.values()];
  }
  return {
    recipes: merge(current.recipes,incoming.recipes),
    kitchen: {
      meals: merge(current.kitchen.meals,incoming.kitchen.meals),
      checks: [...new Set([...current.kitchen.checks,...incoming.kitchen.checks])],
    },
    favorites: [...new Set([...current.favorites,...incoming.favorites])],
  };
}

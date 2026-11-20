import { useCallback, useEffect, useRef, useState } from "react";
import { addDeviceRecipe, changePlan, emptyBook, mergeBackup, readOrUpdate, type DeviceBook } from "../lib/device-book";
import type { Recipe, RecipeInput } from "../lib/recipes";
import type { Change } from "../lib/kitchen";

export function useDeviceBook() {
  const [book,setBook] = useState(emptyBook);
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const channel = useRef<BroadcastChannel|null>(null);
  const pending = useRef(0);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const n = ++sequence.current;
    try {
      const current = await readOrUpdate();
      if (n===sequence.current) { setBook(current); setReady(true); setError(""); }
    } catch {
      if (n===sequence.current) setError("Der Browser kann das Kochbuch auf diesem Gerät gerade nicht lesen. Bitte erlaube Website-Daten und lade erneut.");
    }
  },[]);
  useEffect(() => {
    void refresh();
    const focus = () => { if (!document.hidden) void refresh(); };
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("julia-kochstudio-updates");
      channel.current.onmessage = focus;
    }
    window.addEventListener("focus",focus);
    document.addEventListener("visibilitychange",focus);
    return () => { ++sequence.current; channel.current?.close(); channel.current=null; window.removeEventListener("focus",focus); document.removeEventListener("visibilitychange",focus); };
  },[refresh]);

  async function write(update:(value:DeviceBook)=>DeviceBook) {
    ++pending.current; ++sequence.current; setBusy(true);
    try {
      const next = await readOrUpdate(update);
      ++sequence.current; setBook(next); setReady(true); setError("");
      channel.current?.postMessage("aktualisiert");
    } catch(e) {
      const message = e instanceof Error ? e.message : "Änderung konnte nicht gespeichert werden.";
      setError(message); throw new Error(message);
    } finally { if (!--pending.current) setBusy(false); }
  }
  async function change(action:Change) {
    try { await write(previous=>changePlan(previous,action)); return true; } catch { return false; }
  }
  async function saveRecipe(input:RecipeInput):Promise<Recipe> {
    let saved:Recipe | undefined;
    await write(current=>{const result=addDeviceRecipe(current,input);saved=result.recipe;return result.book;});
    return saved!;
  }
  async function toggleFavorite(id:string) {
    await write(current=>({...current,favorites:current.favorites.includes(id)?current.favorites.filter(x=>x!==id):[...current.favorites,id]}));
  }
  return {book,state:book.kitchen,ready,busy,error,refresh,change,saveRecipe,toggleFavorite,
    restore:(data:DeviceBook)=>write(current=>mergeBackup(current,data))};
}

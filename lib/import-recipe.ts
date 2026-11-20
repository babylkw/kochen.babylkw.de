import { categories, recipeSchema, type RecipeInput } from "./recipes";

const clean = (s: string) => s.replace(/^\s*#{1,6}\s*/, "").replace(/\*\*|__/g, "").trim();
export function parseRecipe(source: string): RecipeInput {
  const value = source.trim().replace(/^\x60{3}(?:json|markdown|text)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  if (value.startsWith("{")) {
    let data;
    try { data = JSON.parse(value); } catch { throw new Error("Das JSON ist unvollständig. Bitte den gesamten Rezepttext einfügen."); }
    const parsed = recipeSchema.safeParse(data);
    if (!parsed.success) throw new Error("Das JSON braucht title, ingredients und steps. Zutaten und Schritte müssen Listen sein.");
    return parsed.data;
  }
  const input: RecipeInput = { title: "", category: "Sonstiges", ingredients: [], steps: [] };
  let section: "ingredients" | "steps" | undefined;
  for (const raw of value.split(/\r?\n/)) {
    const line = clean(raw);
    if (!line) continue;
    if (/^(zutaten(?:liste)?|ingredients)\b/i.test(line)) {
      section = "ingredients"; const p = line.match(/(?:für\s+)?(\d+)\s*(?:Portionen|Personen)/i);
      if (p) input.portions = Number(p[1]); continue;
    }
    if (/^(zubereitung|anleitung|zubereitungsschritte|schritte|zubereitungsweise)\b/i.test(line)) { section = "steps"; continue; }
    if (section) {
      input[section].push(line.replace(/^\s*(?:[-*•]\s*|\d+[.)]\s+)/, "").trim());
    } else if (!input.title) { input.title = line.replace(/^(?:Rezept(?:titel)?|Titel)\s*:\s*/i, ""); }
    else {
      const time = line.match(/(\d+)\s*(?:Minuten|Min\.?)/i);
      const portions = line.match(/(?:Portionen\s*:\s*(\d+)|(\d+)\s*(?:Portionen|Personen))/i);
      if (time) input.minutes = Number(time[1]);
      if (portions) input.portions = Number(portions[1] || portions[2]);
      const category = categories.find(c => line.toLowerCase().includes(c.toLowerCase()));
      if (category) input.category = category;
    }
  }
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) throw new Error("Bitte einen Titel in die erste Zeile setzen. Unter „Zutaten“ und „Zubereitung“ jeweils einen Eintrag pro Zeile einfügen.");
  return parsed.data;
}

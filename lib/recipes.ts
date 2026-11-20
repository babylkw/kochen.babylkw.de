import cookbook from "../daten/rezepte.json" with { type: "json" };
import { z } from "zod";

export const categories = ["Hauptgerichte", "Suppen", "Frühstück", "Desserts", "Beilagen", "Salate", "Sonstiges"] as const;
export const difficulties = ["Einfach", "Mittel", "Aufwendig"] as const;
const lines = z.array(z.string().trim().min(1).max(1200)).min(1).max(80);
export const recipeSchema = z.object({
  title: z.string().trim().min(2).max(110),
  category: z.enum(categories).default("Sonstiges"),
  minutes: z.number().int().min(1).max(10080).optional(),
  portions: z.number().int().min(1).max(150).optional(),
  difficulty: z.enum(difficulties).optional(),
  imageUrl: z.string().max(360000).refine(v => /^https:\/\/[^\s]+$/i.test(v) || /^data:image\/(?:jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(v), "Bitte ein Foto oder eine HTTPS-Bildadresse wählen.").optional(),
  ingredients: lines,
  steps: lines,
});
export type RecipeInput = z.infer<typeof recipeSchema>;
export type Recipe = RecipeInput & { id: string; photo?: string };
export const titleKey = (title: string) => title.normalize("NFKC").toLocaleLowerCase("de").trim().replace(/\s+/g, " ");

export const publicRecipeSchema = recipeSchema.extend({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  photo: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
});
export const examples = z.array(publicRecipeSchema).parse(cookbook);
if (new Set(examples.map(recipe => recipe.id)).size !== examples.length) {
  throw new Error("Jedes veröffentlichte Rezept braucht eine eindeutige ID.");
}

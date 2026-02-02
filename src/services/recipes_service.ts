import type { Db } from "../db.js";
import { createRecipe, replaceRecipeComponents } from "../repos/recipes_repo.js";
import { parseRecipeMatrix, parseRecipePlainText } from "../domain/imports.js";

function persistImportedRecipes(db: Db, imported: ReturnType<typeof parseRecipeMatrix>) {
  const findByName = db.prepare("SELECT id FROM recipes WHERE name = ?");
  for (const recipe of imported) {
    const existing = findByName.get(recipe.name) as { id: number } | undefined;
    const recipeId = existing ? existing.id : createRecipe(db, recipe.name, null);
    replaceRecipeComponents(
      db,
      recipeId,
      recipe.components.map((component) => ({
        recipe_id: recipeId,
        component_name: component.name,
        phr: component.phr
      }))
    );
  }
  return imported.length;
}

export function importRecipesFromText(db: Db, text: string) {
  const imported = parseRecipeMatrix(text);
  return persistImportedRecipes(db, imported);
}

export function importRecipesFromPlainText(db: Db, text: string) {
  const imported = parseRecipePlainText(text);
  return persistImportedRecipes(db, imported);
}

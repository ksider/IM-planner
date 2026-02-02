import express from "express";
import multer from "multer";
import type { Db } from "../db.js";
import {
  deleteAllRecipes,
  deleteRecipe,
  getRecipeComponents,
  listRecipes,
  replaceRecipeComponents,
  updateRecipe
} from "../repos/recipes_repo.js";
import { importRecipesFromPlainText, importRecipesFromText } from "../services/recipes_service.js";

const upload = multer({ storage: multer.memoryStorage() });

export function createRecipesRouter(db: Db) {
  const router = express.Router();

  router.get("/recipes", (_req, res) => {
    const importedCount = _req.query.imported ? Number(_req.query.imported) : null;
    const error = _req.query.error ? String(_req.query.error) : null;
    const recipes = listRecipes(db).map((recipe) => ({
      ...recipe,
      components: getRecipeComponents(db, recipe.id)
    }));
    res.render("recipes", {
      recipes,
      importedCount: Number.isFinite(importedCount) ? importedCount : null,
      error
    });
  });

  router.post("/recipes/import", upload.single("matrix"), (req, res) => {
    const file = req.file;
    if (!file) {
      return res.redirect("/recipes?error=No%20file%20uploaded.");
    }
    const text = file.buffer.toString("utf8");
    const count = importRecipesFromText(db, text);
    return res.redirect(`/recipes?imported=${count}`);
  });

  router.post("/recipes/import-text", (req, res) => {
    const text = typeof req.body.recipe_text === "string" ? req.body.recipe_text : "";
    if (!text.trim()) {
      return res.redirect("/recipes?error=No%20text%20provided.");
    }
    const count = importRecipesFromPlainText(db, text);
    if (count === 0) {
      return res.redirect("/recipes?error=No%20valid%20recipe%20found.");
    }
    return res.redirect(`/recipes?imported=${count}`);
  });

  router.post("/recipes/:id/update", (req, res) => {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) {
      return res.redirect("/recipes?error=Invalid%20recipe%20id.");
    }
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      return res.redirect("/recipes?error=Recipe%20name%20required.");
    }

    const names = req.body.component_name;
    const phrs = req.body.component_phr;
    const nameList = Array.isArray(names) ? names : typeof names === "string" ? [names] : [];
    const phrList = Array.isArray(phrs) ? phrs : typeof phrs === "string" ? [phrs] : [];

    const components = nameList
      .map((componentName, idx) => {
        const raw = typeof componentName === "string" ? componentName.trim() : "";
        const phrRaw = typeof phrList[idx] === "string" ? phrList[idx].trim() : "";
        if (!raw || !phrRaw) return null;
        const normalized = phrRaw.includes(",") && !phrRaw.includes(".") ? phrRaw.replace(",", ".") : phrRaw;
        const value = parseFloat(normalized);
        if (!Number.isFinite(value)) return null;
        return { recipe_id: recipeId, component_name: raw, phr: value };
      })
      .filter((component): component is { recipe_id: number; component_name: string; phr: number } =>
        Boolean(component)
      );

    if (components.length === 0) {
      return res.redirect("/recipes?error=No%20components%20provided.");
    }

    updateRecipe(db, recipeId, name, null);
    replaceRecipeComponents(db, recipeId, components);
    return res.redirect("/recipes");
  });

  router.post("/recipes/:id/delete", (req, res) => {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) {
      return res.redirect("/recipes?error=Invalid%20recipe%20id.");
    }
    deleteRecipe(db, recipeId);
    return res.redirect("/recipes");
  });

  router.post("/recipes/clear", (_req, res) => {
    deleteAllRecipes(db);
    res.redirect("/recipes");
  });

  return router;
}

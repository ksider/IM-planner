import type { Db } from "../db.js";

export type DoeStudy = {
  id: number;
  experiment_id: number;
  name: string;
  design_type: string;
  seed: number;
  center_points: number;
  max_runs: number;
  replicate_count: number;
  recipe_as_block: number;
  created_at: string;
};

export function listDoeStudies(db: Db, experimentId: number): DoeStudy[] {
  return db
    .prepare("SELECT * FROM doe_studies WHERE experiment_id = ? ORDER BY id DESC")
    .all(experimentId) as DoeStudy[];
}

export function getDoeStudy(db: Db, doeId: number): DoeStudy | undefined {
  return db.prepare("SELECT * FROM doe_studies WHERE id = ?").get(doeId) as DoeStudy | undefined;
}

export function createDoeStudy(
  db: Db,
  data: Omit<DoeStudy, "id" | "created_at">
): number {
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO doe_studies
       (experiment_id, name, design_type, seed, center_points, max_runs, replicate_count, recipe_as_block, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.experiment_id,
      data.name,
      data.design_type,
      data.seed,
      data.center_points ?? 3,
      data.max_runs ?? 200,
      data.replicate_count ?? 1,
      data.recipe_as_block ?? 0,
      createdAt
    );
  return Number(result.lastInsertRowid);
}

export function deleteDoeStudy(db: Db, doeId: number) {
  db.prepare("DELETE FROM doe_studies WHERE id = ?").run(doeId);
}

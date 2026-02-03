import type { Db } from "../db.js";

type ReportConfigRow = {
  id: number;
  experiment_id: number;
  name: string;
  executors: string | null;
  include_json: string | null;
  doe_ids_json: string | null;
  created_at: string;
};

export function listReportConfigs(db: Db, experimentId: number): ReportConfigRow[] {
  return db
    .prepare("SELECT * FROM report_configs WHERE experiment_id = ? ORDER BY id DESC")
    .all(experimentId) as ReportConfigRow[];
}

export function getReportConfig(db: Db, reportId: number): ReportConfigRow | null {
  const row = db.prepare("SELECT * FROM report_configs WHERE id = ?").get(reportId) as ReportConfigRow | undefined;
  return row ?? null;
}

export function createReportConfig(
  db: Db,
  data: Omit<ReportConfigRow, "id" | "created_at">
): number {
  const result = db
    .prepare(
      `
      INSERT INTO report_configs (experiment_id, name, executors, include_json, doe_ids_json, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      `
    )
    .run(
      data.experiment_id,
      data.name,
      data.executors,
      data.include_json,
      data.doe_ids_json
    );
  return Number(result.lastInsertRowid);
}

export function deleteReportConfig(db: Db, reportId: number) {
  db.prepare("DELETE FROM report_configs WHERE id = ?").run(reportId);
}

export function updateReportConfig(
  db: Db,
  reportId: number,
  data: Pick<ReportConfigRow, "name" | "executors" | "include_json" | "doe_ids_json">
) {
  db.prepare(
    `
    UPDATE report_configs
    SET name = ?, executors = ?, include_json = ?, doe_ids_json = ?
    WHERE id = ?
    `
  ).run(data.name, data.executors, data.include_json, data.doe_ids_json, reportId);
}

export type { ReportConfigRow };

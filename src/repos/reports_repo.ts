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

type ReportDocumentRow = {
  report_id: number;
  content_json: string;
  html_snapshot: string | null;
  updated_at: string;
};

export function getReportDocument(db: Db, reportId: number): ReportDocumentRow | null {
  const row = db
    .prepare("SELECT * FROM report_documents WHERE report_id = ?")
    .get(reportId) as ReportDocumentRow | undefined;
  return row ?? null;
}

export function upsertReportDocument(
  db: Db,
  reportId: number,
  contentJson: string,
  htmlSnapshot: string | null
) {
  db.prepare(
    `
    INSERT INTO report_documents (report_id, content_json, html_snapshot, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(report_id) DO UPDATE SET
      content_json = excluded.content_json,
      html_snapshot = excluded.html_snapshot,
      updated_at = excluded.updated_at
    `
  ).run(reportId, contentJson, htmlSnapshot);
}

export type { ReportConfigRow };

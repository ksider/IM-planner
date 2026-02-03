import express from "express";
import type { Db } from "../db.js";
import {
  buildReport,
  buildQualificationCsv,
  buildDoeCsv,
  buildOutputsCsv
} from "../services/report_service.js";
import { deleteReportConfig, getReportConfig } from "../repos/reports_repo.js";

const parseInclude = (raw: unknown) => {
  if (!raw) return null;
  return String(raw)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const parseIdList = (raw: unknown) => {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((item) => Number(item))
    .filter((val) => Number.isFinite(val));
};

export function createReportRouter(db: Db) {
  const router = express.Router();

  router.get("/experiments/:id/report", (req, res) => {
    const experimentId = Number(req.params.id);
    const include = parseInclude(req.query.include);
    const doeIds = parseIdList(req.query.doe);
    const executors = req.query.executors ? String(req.query.executors) : null;
    const options = {
      includeQualification: include === null ? true : include.includes("qualification"),
      includeDoe: include === null ? false : include.includes("doe"),
      includeOutputs: include === null ? false : include.includes("outputs"),
      includeDefects: include === null ? false : include.includes("defects"),
      includeRawRuns: include === null ? false : include.includes("raw"),
      executors,
      doeIds
    };
    const reportData = buildReport(db, experimentId, options);
    res.render("report", { report: reportData, options });
  });

  router.get("/reports/:reportId", (req, res) => {
    const reportId = Number(req.params.reportId);
    const config = getReportConfig(db, reportId);
    if (!config) return res.status(404).send("Report not found");
    let include: string[] = [];
    let doeIds: number[] = [];
    if (config.include_json) {
      try {
        const parsed = JSON.parse(config.include_json);
        if (Array.isArray(parsed)) include = parsed.map((item) => String(item).toLowerCase());
      } catch {
        include = [];
      }
    }
    if (config.doe_ids_json) {
      try {
        const parsed = JSON.parse(config.doe_ids_json);
        if (Array.isArray(parsed)) doeIds = parsed.map((item) => Number(item)).filter(Number.isFinite);
      } catch {
        doeIds = [];
      }
    }
    const options = {
      includeQualification: include.includes("qualification"),
      includeDoe: include.includes("doe"),
      includeOutputs: include.includes("outputs"),
      includeDefects: include.includes("defects"),
      includeRawRuns: include.includes("raw"),
      executors: config.executors,
      doeIds
    };
    const reportData = buildReport(db, config.experiment_id, options);
    res.render("report", { report: reportData, options, reportConfig: config });
  });

  router.post("/reports/:reportId/delete", (req, res) => {
    const reportId = Number(req.params.reportId);
    const config = getReportConfig(db, reportId);
    if (!config) return res.status(404).send("Report not found");
    deleteReportConfig(db, reportId);
    res.redirect(`/experiments/${config.experiment_id}`);
  });

  router.get("/experiments/:id/report.csv", (req, res) => {
    const experimentId = Number(req.params.id);
    const section = String(req.query.section || "qualification").toLowerCase();
    const options = {
      includeQualification: section === "qualification",
      includeDoe: section === "doe",
      includeOutputs: section === "outputs",
      includeDefects: false,
      includeRawRuns: false,
      executors: null,
      doeIds: []
    };
    const reportData = buildReport(db, experimentId, options);
    let csv = "";
    let filename = "qualification.csv";
    if (section === "doe") {
      csv = buildDoeCsv(reportData);
      filename = "doe.csv";
    } else if (section === "outputs") {
      csv = buildOutputsCsv(reportData);
      filename = "outputs.csv";
    } else {
      csv = buildQualificationCsv(reportData);
      filename = "qualification.csv";
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.send(csv);
  });

  return router;
}

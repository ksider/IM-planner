import type { Db } from "../db.js";
import type { Request, Response, NextFunction } from "express";
import { getExperiment } from "../repos/experiments_repo.js";
import { getReportConfig } from "../repos/reports_repo.js";
import { getRun } from "../repos/runs_repo.js";

export function ensureExperimentAccess(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const experimentId = Number(req.params.id);
    if (!Number.isFinite(experimentId)) {
      return res.status(404).send("Experiment not found");
    }
    const experiment = getExperiment(db, experimentId);
    if (!experiment) return res.status(404).send("Experiment not found");

    if (canAccessExperiment(req.user, experiment)) return next();
    return res.status(403).send("Forbidden");
  };
}

export function ensureReportAccess(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const reportId = Number(req.params.reportId);
    if (!Number.isFinite(reportId)) return res.status(404).send("Report not found");
    const config = getReportConfig(db, reportId);
    if (!config) return res.status(404).send("Report not found");
    const experiment = getExperiment(db, config.experiment_id);
    if (!experiment) return res.status(404).send("Experiment not found");
    if (canAccessExperiment(req.user, experiment)) return next();
    return res.status(403).send("Forbidden");
  };
}

export function ensureRunAccess(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const runId = Number(req.params.id);
    if (!Number.isFinite(runId)) return res.status(404).send("Run not found");
    const run = getRun(db, runId);
    if (!run) return res.status(404).send("Run not found");
    const experiment = getExperiment(db, run.experiment_id);
    if (!experiment) return res.status(404).send("Experiment not found");
    if (canAccessExperiment(req.user, experiment)) return next();
    return res.status(403).send("Forbidden");
  };
}

function canAccessExperiment(
  user: Express.User | undefined,
  experiment: { owner_user_id: number | null }
) {
  if (user?.role === "admin") return true;
  if (experiment.owner_user_id == null) return true;
  return user?.id === experiment.owner_user_id;
}

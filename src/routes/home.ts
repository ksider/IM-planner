import express from "express";
import type { Db } from "../db.js";
import { listExperiments, listExperimentsForOwner } from "../repos/experiments_repo.js";

export function createHomeRouter(db: Db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    // Admin sees all active experiments; others see only their own.
    const experiments =
      req.user?.role === "admin"
        ? listExperiments(db, false)
        : req.user?.id
          ? listExperimentsForOwner(db, req.user.id, false)
          : [];
    res.render("home", { experiments });
  });

  router.get("/my-experiments", (req, res) => {
    // Personal list for the current user.
    const experiments = req.user?.id
      ? listExperimentsForOwner(db, req.user.id, false)
      : [];
    res.render("my_experiments", { experiments });
  });

  return router;
}

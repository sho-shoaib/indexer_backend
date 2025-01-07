import { Router } from "express";
import {
  getPools,
  getPoolSnapshotsById,
  updatePoolsFees,
} from "../controllers/pool";

const router = Router();

router.get("/", getPools);
// router.get("/:id", getPoolSnapshotsById);
router.get("/updatefees", updatePoolsFees);

export default router;

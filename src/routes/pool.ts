import { Router } from "express";
import {
  getPools,
  getPoolSnapshotsById,
  updatePoolsFees,
  updatePools
} from "../controllers/pool";

const router = Router();

router.get("/", getPools);
// router.get("/:id", getPoolSnapshotsById);
router.get("/updatefees", updatePoolsFees);
router.get("/updatepools", updatePools)

export default router;

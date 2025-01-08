import { Router } from "express";
import { getAssets, addAssets, getAssetById, updateAssetsExchangeRate } from "../controllers/asset";

const router = Router();

router.get("/", getAssets);
router.post("/add", addAssets);
// router.get("/:id", getAssetById);
router.get("/exchangerate", updateAssetsExchangeRate)

export default router;

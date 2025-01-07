import { gql } from "urql";
import { Asset } from "../models";
import { CustomError } from "../utils/error_factory";
import { client } from "..";
import { NextFunction, Request, Response } from "express";
import { addAsset } from "../functions/asset";

type AssetResponse = {
  id: string;
  price_usd: number;
};

const getAssets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const assets = await Asset.findAll();
    return res.status(200).json({
      assets,
    });
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get assets";

    return next(
      new CustomError(message, statusCode, { context: "getAssets", error })
    );
  }
};

const addAssets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const assets = req.body.assets;

    const toSend = [];
    for (const asset of assets) {
      const newAsset = await addAsset(asset, next);
      toSend.push(newAsset);
    }

    return res.status(201).json({
      assetsAdded: toSend,
    });
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to add assets";

    return next(
      new CustomError(message, statusCode, { context: "addAssets", error })
    );
  }
};

const getAssetById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const id = req.params.id;

    const asset = await Asset.findByPk(id);

    return res.status(200).json({
      asset,
    });
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get asset by id";

    return next(
      new CustomError(message, statusCode, { context: "getAssetById", error })
    );
  }
};

export { getAssets, addAssets, getAssetById };

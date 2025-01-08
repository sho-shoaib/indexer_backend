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

const updateAssetsExchangeRate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const exchangeRateQuery = gql`
      query MyQuerys {
        Asset {
          id
          exchange_rate_usdc
          exchange_rate_eth
          exchange_rate_fuel
        }
      }
    `;

    //@ts-ignore
    const result = await client.query(exchangeRateQuery);

    console.log(result.data.Asset);

    const updatedAssets = [];
  console.log(result.data.Asset.length);
  

    for (const asset of result.data.Asset) {
      const updatedAsset = await Asset.update({
        exchange_rate_eth: asset.exchange_rate_eth,
        exchange_rate_usdc: asset.exchange_rate_usdc,
        exchange_rate_fuel: asset.exchange_rate_fuel
      }, {
        where: {
          asset_id: asset.id
        }
      })

      updatedAssets.push({asset_id: asset.id, exchange_rate_eth: asset.exchange_rate_eth,
        exchange_rate_usdc: asset.exchange_rate_usdc,
        exchange_rate_fuel: asset.exchange_rate_fuel})
    }

    res.status(200).json(updatedAssets)
}

export { getAssets, addAssets, getAssetById, updateAssetsExchangeRate };

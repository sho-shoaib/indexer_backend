import { NextFunction } from "express";
import { Asset } from "../../models";
import { CustomError } from "../../utils/error_factory";

export const addAsset = async (asset: any, next: NextFunction) => {
  try {
    const toAdd = {
      asset_id: asset.asset_id,
      name: asset.name,
      symbol: asset.symbol,
      decimals: asset.decimals,
      icon: asset.image,
      l1_address: asset.l1Address,
      contract_id: asset.contractId,
      subId: asset.subId,
      exchange_rate_usdc: asset.exchange_rate_usdc ?? 0,
      exchange_rate_eth: asset.exchange_rate_eth ?? 0,
      exchange_rate_fuel: asset.exchange_rate_fuel ?? 0,
    };

    //@ts-ignore
    const [newAsset, created] = await Asset.findOrCreate({
      where: {
        asset_id: asset.asset_id,
      },
      defaults: toAdd,
    });

    if (!created) {
      newAsset.name = asset.name;
      newAsset.symbol = asset.symbol;
      newAsset.decimals = asset.decimals;
      newAsset.icon = asset.icon;
      newAsset.l1_address = asset.l1_address;
      newAsset.contract_id = asset.contract_id;
      newAsset.subId = asset.subId;
      newAsset.exchange_rate_usdc = asset.exchange_rate_usdc;
      newAsset.exchange_rate_eth = asset.exchange_rate_eth;
      newAsset.exchange_rate_fuel = asset.exchange_rate_fuel;
    }

    newAsset.save();

    return newAsset;
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to getAsset from db";

    return next(
      new CustomError(message, statusCode, { context: "addAsset", error })
    );
  }
};

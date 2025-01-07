import { NextFunction } from "express";
import { Asset, Pool } from "../../models";
import { CustomError } from "../../utils/error_factory";
import { gql } from "urql";
import { client } from "../..";
import { PoolType } from "../../types/modelTypes";

// TODO Can only use this to get asset
const isAsset = async (id: string) => {
  return Asset.findOne({ where: { asset_id: id } }).then(
    (asset) => asset !== null
  );
};

export const addAssets = async (
  pool: PoolType,
  next: NextFunction
): Promise<Pool | null | undefined> => {
  try {
    const isAsset0 = await isAsset(pool.asset_0);
    const isAsset1 = await isAsset(pool.asset_1);
    console.log(isAsset0, isAsset1);

    if (isAsset0 === false || isAsset1 === false) {
      return null;
    }

    const toAdd = {
      pool_id: pool.id,
      asset_0: pool.asset_0,
      asset_1: pool.asset_1,
      create_time: pool.create_time,
      is_stable: pool.is_stable,
      reserve_0: pool.reserve_0,
      reserve_1: pool.reserve_1,
      decimals_0: pool.decimals_0,
      decimals_1: pool.decimals_1,
      tvl: pool.tvl,
      tvlUSD: pool.tvlUSD,
      fees24hr: 0,
      volume24hr: 0
    };

    const [newPool, created] = await Pool.findOrCreate({
      where: {
        pool_id: pool.id,
      },
      defaults: toAdd,
    });

    if (!created) {
      newPool.is_stable = pool.is_stable;
      newPool.reserve_0 = pool.reserve_0;
      newPool.reserve_1 = pool.reserve_1;
      newPool.tvl = pool.tvl;
      newPool.tvlUSD;
    }

    newPool.save();

    const newPoolWithAssets = await Pool.findByPk(newPool.pool_id, {
      include: [
        {
          model: Asset,
          as: "Asset0",
          attributes: ["asset_id", "name", "symbol", "icon", "exchange_rate_usdc", "exchange_rate_eth", "exchange_rate_fuel"],
        },
        {
          model: Asset,
          as: "Asset1",
          attributes: ["asset_id", "name", "symbol", "icon", "exchange_rate_usdc", "exchange_rate_eth", "exchange_rate_fuel"],
        },
      ],
    });

    // let snapshots = [];
    // if (newPoolWithAssets!.tvlUSD > 0) {
    //   snapshots = await getPoolSnapshots(newPoolWithAssets?.pool_id, next);
    // }

    // const newPoolWithAssetsAndSnapshots = {
    //   ...newPoolWithAssets,
    //   snapshots,
    // };

    // console.log(newPoolWithAssetsAndSnapshots);

    return newPoolWithAssets;
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to getPool from db";

    next(new CustomError(message, statusCode, { context: "addPool", error }));
  }
};

const getPoolSnapshots = async (id: any, next: NextFunction): Promise<any> => {
  const timestamp24hAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  try {
    const pool_query = gql`
      query MyQuery($time: Int!) {
        SwapHourly(limit: 25, where: {volume: {_gt: "0"}, pool_id: {_eq: "${id}"}, snapshot_time: {_gt: $time}}) {
          feesUSD
          volume
          snapshot_time
          pool_id
          id
          count
        }
      }
    `;
    //@ts-ignore
    const result = await client.query(pool_query, { time: timestamp24hAgo });
    console.log(result.data.SwapHourly);

    return result.data.SwapHourly;
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get pool snapshot";
    console.error(error);
    next(
      new CustomError(message, statusCode, {
        context: "getSnapshotsByID",
        error,
      })
    );
  }
};

export interface SwapDaily {
  pool_id: string;
  feesUSD: string;
  volume: string; // Added field for volume
  __typename: 'SwapDaily';
}

interface PoolVolumeAndFees {
  pool_id: string;
  fees24hr: number;
  volume24hr: number;
}

interface VolumeAndFeesAggregator {
  [key: string]: {
    fees: number;
    volume: number;
  };
}

export function aggregatePoolFeesAndVolume(data: SwapDaily[]): PoolVolumeAndFees[] {
  // Create an object to store the aggregated fees and volumes
  const aggregator: VolumeAndFeesAggregator = {};

  // Iterate through the data and aggregate both fees and volume for each pool
  data.forEach((item: SwapDaily) => {
    const poolId: string = item.pool_id;
    const fees: number = parseFloat(item.feesUSD);
    const volume: number = parseFloat(item.volume);

    // If pool exists, add to its fees and volume, otherwise initialize
    if (poolId in aggregator) {
      aggregator[poolId].fees += fees;
      aggregator[poolId].volume += volume;
    } else {
      aggregator[poolId] = { fees, volume };
    }
  });

  // Convert the object to array of objects with desired structure
  const result: PoolVolumeAndFees[] = Object.entries(aggregator).map(([poolId, data]) => ({
    pool_id: poolId,
    fees24hr: data.fees,
    volume24hr: data.volume,
  }));

  // Sort by volume24hr first, then by fees24hr if volumes are the same
  result.sort((a, b) => b.volume24hr - a.volume24hr || b.fees24hr - a.fees24hr);

  return result;
}

import { gql } from "urql";
import { Asset, Pool } from "../models";
import { CustomError } from "../utils/error_factory";
import { client } from "..";
import { NextFunction, Request, Response } from "express";
import { addAssets, aggregatePoolFeesAndVolume, SwapDaily } from "../functions/pool";

const getPools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const allPools = await Pool.findAll({
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
      order: [['tvlUSD', 'DESC']],
    });
    
    return res.status(200).json({ success: allPools });
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get pools";

    return next(
      new CustomError(message, statusCode, { context: "getPools", error })
    );
  }
};

const getPoolSnapshotsById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const timestamp24hAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  try {
    const id = req.params.id;
    console.log(id);

    const pool_query = gql`
      query MyQuery($time: Int!) {
        SwapHourly(where: {volume: {_gt: "0"}, pool_id: {_eq: "${id}"}, snapshot_time: {_gt: $time}}) {
          feesUSD
          volume
          snapshot_time
          pool_id
        }
      }
    `;
    //@ts-ignore
    const result = await client.query(pool_query, { time: timestamp24hAgo });

    console.log(typeof result);

    if (typeof result !== undefined) {
      res.status(200).json({
        data: result.data.SwapHourly,
      });
    }
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get pool snapshot";
    console.error(error);
    return next(
      new CustomError(message, statusCode, {
        context: "getSnapshotsByID",
        error,
      })
    );
  }
};

const updatePoolsFees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const pools = await Pool.findAll({
      order: [["tvlUSD", "DESC"]],
      limit: 25,
    });

    const yesterdayMidnightTimestamp = Math.floor(
      new Date(new Date().setDate(new Date().getDate() - 1)).setHours(
        0,
        0,
        0,
        0
      ) / 1000
    );

    const feesQuery = gql`
      query MyQuery($time: Int!) {
        SwapDaily(
          where: { snapshot_time: { _gte: $time }, feesUSD: {_gt: 0} }
        ) {
          pool_id
          feesUSD
          volume
        }
      }
    `;

    const result = await client.query(feesQuery, {
      time: yesterdayMidnightTimestamp,
    });
    
    const snapshots: SwapDaily[] = result.data.SwapDaily
    
    const poolsWithFees = aggregatePoolFeesAndVolume(snapshots)
    
    const updatedPools: any[] = [];
    for (const pool of poolsWithFees) {
      const updatedPool = await Pool.update({
        fees24hr: pool.fees24hr,
        volume24hr: pool.volume24hr
      }, {
        where: {
          pool_id: pool.pool_id
        },
      })

      // TODO Response is not right
      updatedPools.push({pool_id: pool.pool_id, fees24hr: pool.fees24hr, volume24hr: pool.volume24hr})
    }

    return res.json({
      updatedPools,
    });
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get pool snapshot";
    console.error(error);
    return next(
      new CustomError(message, statusCode, {
        context: "updatePoolsFees",
        error,
      })
    );
  }
};

const updatePools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const pools_query = gql`
      query MyQuery {
        Pool(limit: 100, order_by: { tvlUSD: desc }) {
          asset_0
          asset_1
          id
          create_time
          decimals_0
          decimals_1
          reserve_0
          reserve_1
          is_stable
          tvl
          tvlUSD
        }
      }
    `;

    //@ts-ignore
    const result = await client.query(pools_query);

    const pools = result.data.Pool;

    const toSend = [];

    for (const pool of pools) {
      let dbPool = await addAssets(pool, next);
      console.log(typeof dbPool);

      if (typeof dbPool !== null || undefined) {
        toSend.push(dbPool);
      }
    }
    return res.status(200).json({
      updatedPools: toSend
    })
  } catch (error) {
    const statusCode = 500;
    const message = "Failed to get pool snapshot";
    console.error(error);
    return next(
      new CustomError(message, statusCode, {
        context: "updatePools",
        error,
      })
    );
  }
  
}

export { getPools, getPoolSnapshotsById, updatePoolsFees, updatePools };

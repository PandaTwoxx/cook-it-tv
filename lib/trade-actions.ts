"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Create a new trade offer
export async function createTrade(fromUserId: string, toUserId: string, fromCookId: string, toCookId: string) {
  try {
    // Verify both cooks exist and belong to the correct users
    const fromCook = await sql`
      SELECT * FROM "Cook" WHERE id = ${fromCookId} AND "userId" = ${fromUserId}
    `

    const toCook = await sql`
      SELECT * FROM "Cook" WHERE id = ${toCookId} AND "userId" = ${toUserId}
    `

    if (fromCook.length === 0) {
      return { error: "You don't own this cook" }
    }

    if (toCook.length === 0) {
      return { error: "The other user doesn't own that cook" }
    }

    // Create the trade
    await sql`
      INSERT INTO "Trade" (id, "fromUserId", "toUserId", "fromCookId", "toCookId", status, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${fromUserId}, ${toUserId}, ${fromCookId}, ${toCookId}, 'pending', NOW(), NOW())
    `

    revalidatePath("/trades")
    return { success: true }
  } catch (error) {
    console.error("Create trade error:", error)
    return { error: "Failed to create trade" }
  }
}

// Accept a trade
export async function acceptTrade(tradeId: string, userId: string) {
  try {
    // Get the trade details
    const trades = await sql`
      SELECT * FROM "Trade" WHERE id = ${tradeId} AND "toUserId" = ${userId} AND status = 'pending'
    `

    if (trades.length === 0) {
      return { error: "Trade not found or already processed" }
    }

    const trade = trades[0]

    // Verify both cooks still exist and belong to correct users
    const fromCook = await sql`
      SELECT * FROM "Cook" WHERE id = ${trade.fromCookId} AND "userId" = ${trade.fromUserId}
    `

    const toCook = await sql`
      SELECT * FROM "Cook" WHERE id = ${trade.toCookId} AND "userId" = ${trade.toUserId}
    `

    if (fromCook.length === 0 || toCook.length === 0) {
      return { error: "One or both cooks no longer exist" }
    }

    // Perform the trade by swapping cook ownership
    await sql`
      UPDATE "Cook" SET "userId" = ${trade.toUserId} WHERE id = ${trade.fromCookId}
    `

    await sql`
      UPDATE "Cook" SET "userId" = ${trade.fromUserId} WHERE id = ${trade.toCookId}
    `

    // Update trade status
    await sql`
      UPDATE "Trade" SET status = 'accepted', "updatedAt" = NOW() WHERE id = ${tradeId}
    `

    revalidatePath("/trades")
    revalidatePath("/inventory")
    return { success: true }
  } catch (error) {
    console.error("Accept trade error:", error)
    return { error: "Failed to accept trade" }
  }
}

// Decline a trade
export async function declineTrade(tradeId: string, userId: string) {
  try {
    const result = await sql`
      UPDATE "Trade" 
      SET status = 'declined', "updatedAt" = NOW() 
      WHERE id = ${tradeId} AND "toUserId" = ${userId} AND status = 'pending'
    `

    if (result.length === 0) {
      return { error: "Trade not found or already processed" }
    }

    revalidatePath("/trades")
    return { success: true }
  } catch (error) {
    console.error("Decline trade error:", error)
    return { error: "Failed to decline trade" }
  }
}

// Get user's trades (both sent and received)
export async function getUserTrades(userId: string) {
  try {
    const trades = await sql`
      SELECT 
        t.*,
        fromUser.name as "fromUserName",
        toUser.name as "toUserName",
        fromCook.name as "fromCookName",
        fromCook.rarity as "fromCookRarity",
        fromCook.icon as "fromCookIcon",
        toCook.name as "toCookName",
        toCook.rarity as "toCookRarity",
        toCook.icon as "toCookIcon"
      FROM "Trade" t
      JOIN "User" fromUser ON t."fromUserId" = fromUser.id
      JOIN "User" toUser ON t."toUserId" = toUser.id
      LEFT JOIN "Cook" fromCook ON t."fromCookId" = fromCook.id
      LEFT JOIN "Cook" toCook ON t."toCookId" = toCook.id
      WHERE t."fromUserId" = ${userId} OR t."toUserId" = ${userId}
      ORDER BY t."createdAt" DESC
    `

    return trades.map((trade) => ({
      id: trade.id,
      fromUserId: trade.fromUserId,
      toUserId: trade.toUserId,
      fromUserName: trade.fromUserName,
      toUserName: trade.toUserName,
      fromCook: {
        id: trade.fromCookId,
        name: trade.fromCookName,
        rarity: trade.fromCookRarity,
        icon: trade.fromCookIcon,
      },
      toCook: {
        id: trade.toCookId,
        name: trade.toCookName,
        rarity: trade.toCookRarity,
        icon: trade.toCookIcon,
      },
      status: trade.status,
      createdAt: new Date(trade.createdAt).toISOString(),
      isSentByUser: trade.fromUserId === userId,
    }))
  } catch (error) {
    console.error("Get user trades error:", error)
    return []
  }
}

// Get all users with their cooks for trading
export async function getUsersWithCooks() {
  try {
    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.username,
        COUNT(c.id) as "cookCount"
      FROM "User" u
      LEFT JOIN "Cook" c ON u.id = c."userId"
      GROUP BY u.id, u.name, u.username
      HAVING COUNT(c.id) > 0
      ORDER BY u.name
    `

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      cookCount: Number.parseInt(user.cookCount),
    }))
  } catch (error) {
    console.error("Get users with cooks error:", error)
    return []
  }
}

// Get a specific user's cooks
export async function getUserCooks(userId: string) {
  try {
    const cooks = await sql`
      SELECT * FROM "Cook" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
    `

    return cooks.map((cook) => ({
      id: cook.id,
      name: cook.name,
      rarity: cook.rarity,
      sellValue: cook.sellValue,
      icon: cook.icon,
    }))
  } catch (error) {
    console.error("Get user cooks error:", error)
    return []
  }
}

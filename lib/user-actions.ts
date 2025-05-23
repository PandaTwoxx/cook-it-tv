"use server"

import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { cookRarities } from "./game-config"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Helper function to calculate time until next claim
function getTimeUntilNextClaim(lastClaimTime) {
  if (!lastClaimTime) return "Now"

  const now = new Date()
  const lastClaim = new Date(lastClaimTime)
  const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  const diff = nextClaim.getTime() - now.getTime()

  if (diff <= 0) return "Now"

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m`
}

// Helper function to check if user can claim
function canUserClaim(lastClaimTime) {
  if (!lastClaimTime) return true

  const now = new Date()
  const lastClaim = new Date(lastClaimTime)
  const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  return now >= nextClaim
}

// Register a new user
export async function registerUser({ name, username, password }) {
  try {
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM "User" WHERE username = ${username}
    `

    if (existingUser.length > 0) {
      return { error: "User with this username already exists" }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user
    await sql`
      INSERT INTO "User" (id, name, username, password, tokens, "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${name}, ${username}, ${hashedPassword}, 100, NOW(), NOW())
    `

    return { success: true }
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "Failed to register user" }
  }
}

// Get user data
export async function getUserData(username) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return { error: "Your account has been banned. Please contact support." }
    }

    const inventory = await sql`
      SELECT * FROM "Cook" WHERE "userId" = ${user.id}
    `

    // Group inventory by cook name and count duplicates
    const groupedInventory = inventory.reduce((acc, item) => {
      const existing = acc.find((cook) => cook.name === item.name && cook.rarity === item.rarity)
      if (existing) {
        existing.count += 1
        existing.ids.push(item.id)
      } else {
        acc.push({
          id: item.id,
          ids: [item.id],
          name: item.name,
          rarity: item.rarity,
          sellValue: item.sellValue,
          icon: item.icon,
          count: 1,
        })
      }
      return acc
    }, [])

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      tokens: user.tokens,
      isAdmin: user.isAdmin,
      canClaim: canUserClaim(user.lastClaim),
      nextClaimTime: getTimeUntilNextClaim(user.lastClaim),
      inventory: groupedInventory,
    }
  } catch (error) {
    console.error("Get user data error:", error)
    return { error: "Failed to get user data" }
  }
}

// Update user settings
export async function updateUserSettings({ userId, name, username }) {
  try {
    // Check if username is already taken by another user
    if (username) {
      const existingUser = await sql`
        SELECT id FROM "User" WHERE username = ${username} AND id != ${userId}
      `

      if (existingUser.length > 0) {
        return { error: "Username is already taken" }
      }
    }

    // Update user
    await sql`
      UPDATE "User" 
      SET name = ${name}, username = ${username}, "updatedAt" = NOW()
      WHERE id = ${userId}
    `

    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Update user settings error:", error)
    return { error: "Failed to update user settings" }
  }
}

// Update user password
export async function updateUserPassword({ userId, currentPassword, newPassword }) {
  try {
    // Get user
    const users = await sql`
      SELECT * FROM "User" WHERE id = ${userId}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return { error: "Current password is incorrect" }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await sql`
      UPDATE "User" 
      SET password = ${hashedPassword}, "updatedAt" = NOW()
      WHERE id = ${userId}
    `

    return { success: true }
  } catch (error) {
    console.error("Update password error:", error)
    return { error: "Failed to update password" }
  }
}

// Claim daily tokens
export async function claimDailyTokens(username) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return { error: "Your account has been banned. Please contact support." }
    }

    // Check if user can claim
    if (!canUserClaim(user.lastClaim)) {
      return { error: "You've already claimed your daily tokens" }
    }

    // Generate random token amount (500-1500)
    // Lower numbers have higher probability
    let tokenAmount
    const rand = Math.random()

    if (rand < 0.4) {
      // 40% chance for 500-700
      tokenAmount = Math.floor(Math.random() * 201) + 500
    } else if (rand < 0.7) {
      // 30% chance for 701-900
      tokenAmount = Math.floor(Math.random() * 200) + 701
    } else if (rand < 0.9) {
      // 20% chance for 901-1200
      tokenAmount = Math.floor(Math.random() * 300) + 901
    } else {
      // 10% chance for 1201-1500
      tokenAmount = Math.floor(Math.random() * 300) + 1201
    }

    // Ensure it's a multiple of 50
    tokenAmount = Math.round(tokenAmount / 50) * 50

    // Update user tokens and last claim time
    await sql`
      UPDATE "User" 
      SET tokens = ${user.tokens + tokenAmount}, "lastClaim" = NOW(), "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return {
      success: true,
      amount: tokenAmount,
    }
  } catch (error) {
    console.error("Claim tokens error:", error)
    return { error: "Failed to claim tokens" }
  }
}

// Open a pack - improved with better error handling and transaction safety
export async function openPack(username, packType) {
  try {
    // Validate pack type
    if (packType !== "og") {
      return { error: "Invalid pack type" }
    }

    // Get user data first
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return { error: "Your account has been banned. Please contact support." }
    }

    // Check if user has enough tokens
    if (user.tokens < 25) {
      return { error: "Not enough tokens" }
    }

    // Validate cook rarities configuration
    if (!cookRarities || cookRarities.length === 0) {
      console.error("Cook rarities configuration is missing or empty")
      return { error: "Game configuration error. Please try again." }
    }

    // Calculate total probability to ensure it's valid
    const totalProbability = cookRarities.reduce((sum, rarity) => sum + rarity.dropRate, 0)
    if (totalProbability <= 0) {
      console.error("Invalid cook rarities probability configuration")
      return { error: "Game configuration error. Please try again." }
    }

    // Generate random number for rarity selection
    const rand = Math.random() * totalProbability
    let selectedRarity = null
    let cumulativeProbability = 0

    // Find the selected rarity based on probability
    for (const rarity of cookRarities) {
      cumulativeProbability += rarity.dropRate
      if (rand <= cumulativeProbability) {
        selectedRarity = rarity
        break
      }
    }

    // Fallback to last rarity if none selected (shouldn't happen but safety check)
    if (!selectedRarity) {
      selectedRarity = cookRarities[cookRarities.length - 1]
    }

    // Validate selected rarity has cooks
    if (!selectedRarity.cooks || selectedRarity.cooks.length === 0) {
      console.error("Selected rarity has no cooks:", selectedRarity)
      return { error: "Game configuration error. Please try again." }
    }

    // Select a random cook from the rarity
    const cookIndex = Math.floor(Math.random() * selectedRarity.cooks.length)
    const cookName = selectedRarity.cooks[cookIndex]

    if (!cookName) {
      console.error("Failed to select cook name from rarity:", selectedRarity)
      return { error: "Failed to select cook. Please try again." }
    }

    // Generate unique cook ID
    const cookId = crypto.randomUUID()

    // Use a transaction-like approach: deduct tokens first, then add cook
    // If adding cook fails, we'll need to rollback the token deduction
    let tokenUpdateResult
    try {
      // Deduct tokens first
      tokenUpdateResult = await sql`
        UPDATE "User" 
        SET tokens = ${user.tokens - 25}, "updatedAt" = NOW()
        WHERE username = ${username} AND tokens >= 25
        RETURNING tokens
      `

      // Check if the update actually happened (user still had enough tokens)
      if (tokenUpdateResult.length === 0) {
        return { error: "Not enough tokens or user not found" }
      }

      // Add cook to user's inventory
      await sql`
        INSERT INTO "Cook" (id, name, rarity, "sellValue", icon, "userId", "createdAt")
        VALUES (
          ${cookId}, 
          ${cookName}, 
          ${selectedRarity.type}, 
          ${selectedRarity.sellValue}, 
          ${selectedRarity.icon || "👨‍🍳"}, 
          ${user.id}, 
          NOW()
        )
      `

      // Revalidate relevant paths
      revalidatePath("/shop")
      revalidatePath("/inventory")

      return {
        success: true,
        id: cookId,
        name: cookName,
        rarity: selectedRarity.type,
        sellValue: selectedRarity.sellValue,
        icon: selectedRarity.icon || "👨‍🍳",
        dropRate: selectedRarity.dropRate,
      }
    } catch (cookInsertError) {
      console.error("Failed to insert cook, attempting to rollback tokens:", cookInsertError)

      // Try to rollback the token deduction
      try {
        await sql`
          UPDATE "User" 
          SET tokens = ${user.tokens}, "updatedAt" = NOW()
          WHERE username = ${username}
        `
        console.log("Successfully rolled back token deduction")
      } catch (rollbackError) {
        console.error("Failed to rollback token deduction:", rollbackError)
        // This is a serious error - user lost tokens but didn't get cook
        // In production, this should trigger an alert/notification system
      }

      return { error: "Failed to open pack. Please try again." }
    }
  } catch (error) {
    console.error("Open pack error:", error)
    return { error: "Failed to open pack. Please try again." }
  }
}

// Sell a cook
export async function sellCook(username, cookId) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return { error: "Your account has been banned. Please contact support." }
    }

    const cooks = await sql`
      SELECT * FROM "Cook" WHERE id = ${cookId} AND "userId" = ${user.id}
    `

    if (cooks.length === 0) {
      return { error: "Cook not found in your inventory" }
    }

    const cook = cooks[0]

    // Add tokens to user and remove cook in a transaction-like manner
    try {
      // Add tokens to user
      await sql`
        UPDATE "User" 
        SET tokens = ${user.tokens + cook.sellValue}, "updatedAt" = NOW()
        WHERE username = ${username}
      `

      // Remove cook from inventory
      await sql`
        DELETE FROM "Cook" WHERE id = ${cookId}
      `

      // Revalidate relevant paths
      revalidatePath("/inventory")

      return {
        success: true,
        tokensReceived: cook.sellValue,
      }
    } catch (transactionError) {
      console.error("Sell cook transaction error:", transactionError)
      return { error: "Failed to sell cook. Please try again." }
    }
  } catch (error) {
    console.error("Sell cook error:", error)
    return { error: "Failed to sell cook" }
  }
}

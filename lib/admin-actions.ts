"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Get all users
export async function getAllUsers() {
  try {
    const users = await sql`
      SELECT 
        u.*,
        COUNT(c.id) as "cookCount"
      FROM "User" u
      LEFT JOIN "Cook" c ON u.id = c."userId"
      GROUP BY u.id, u.name, u.username, u.tokens, u."lastClaim", u."isAdmin", u."isBanned", u."createdAt", u."updatedAt"
      ORDER BY u."createdAt" DESC
    `

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      tokens: user.tokens,
      lastClaim: user.lastClaim ? new Date(user.lastClaim).toLocaleString() : null,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned || false,
      cookCount: Number.parseInt(user.cookCount),
    }))
  } catch (error) {
    console.error("Get all users error:", error)
    throw new Error("Failed to get users")
  }
}

// Update user tokens
export async function updateUserTokens(username, amount) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Calculate new token amount (ensure it doesn't go below 0)
    const newTokenAmount = Math.max(0, user.tokens + amount)

    await sql`
      UPDATE "User" 
      SET tokens = ${newTokenAmount}, "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return {
      success: true,
      newBalance: newTokenAmount,
    }
  } catch (error) {
    console.error("Update tokens error:", error)
    return { error: "Failed to update tokens" }
  }
}

// Grant admin access to a user
export async function grantAdminAccess(username) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    await sql`
      UPDATE "User" 
      SET "isAdmin" = true, "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return { success: true }
  } catch (error) {
    console.error("Grant admin access error:", error)
    return { error: "Failed to grant admin access" }
  }
}

// Remove admin access from a user (requires master admin password)
export async function removeAdminAccess(username, masterPassword) {
  try {
    // Check master password
    if (masterPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return { error: "Invalid master admin password" }
    }

    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    await sql`
      UPDATE "User" 
      SET "isAdmin" = false, "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return { success: true }
  } catch (error) {
    console.error("Remove admin access error:", error)
    return { error: "Failed to remove admin access" }
  }
}

// Update the banUser function to require master password for admin users
export async function banUser(username, masterPassword = null) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if target user is an admin - if so, require master password
    if (user.isAdmin) {
      // Verify master password is provided and correct
      if (!masterPassword || masterPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        return { error: "Master admin password required to ban admin users" }
      }
    }

    await sql`
      UPDATE "User" 
      SET "isBanned" = true, "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return { success: true }
  } catch (error) {
    console.error("Ban user error:", error)
    return { error: "Failed to ban user" }
  }
}

// Update the unbanUser function to require master password for admin users
export async function unbanUser(username, masterPassword = null) {
  try {
    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `

    if (users.length === 0) {
      return { error: "User not found" }
    }

    const user = users[0]

    // Check if target user is an admin - if so, require master password
    if (user.isAdmin) {
      // Verify master password is provided and correct
      if (!masterPassword || masterPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        return { error: "Master admin password required to unban admin users" }
      }
    }

    await sql`
      UPDATE "User" 
      SET "isBanned" = false, "updatedAt" = NOW()
      WHERE username = ${username}
    `

    return { success: true }
  } catch (error) {
    console.error("Unban user error:", error)
    return { error: "Failed to unban user" }
  }
}

// Execute custom SQL query
export async function executeSQL(query) {
  try {
    // Split query by semicolons to handle multiple statements
    const queries = query.split(";").filter((q) => q.trim())
    const results = []

    for (const singleQuery of queries) {
      if (singleQuery.trim()) {
        const result = await sql.unsafe(singleQuery.trim())
        results.push({
          query: singleQuery.trim(),
          result: result,
          rowCount: Array.isArray(result) ? result.length : 1,
        })
      }
    }

    return { success: true, results }
  } catch (error) {
    console.error("SQL execution error:", error)
    return { error: error.message || "Failed to execute SQL" }
  }
}

// Delete oldest N messages
export async function deleteOldestMessages(count) {
  try {
    await sql`
      DELETE FROM "Message" 
      WHERE id IN (
        SELECT id FROM "Message" 
        ORDER BY "createdAt" ASC 
        LIMIT ${count}
      )
    `
    revalidatePath("/chat")
    revalidatePath("/admin")
    return { success: true, count }
  } catch (error) {
    console.error("Delete messages error:", error)
    return { error: "Failed to delete messages" }
  }
}

// Clear all messages
export async function clearAllMessages() {
  try {
    await sql`DELETE FROM "Message"`
    revalidatePath("/chat")
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    console.error("Clear messages error:", error)
    return { error: "Failed to clear messages" }
  }
}

// Delete a user and all their data (requires master admin password)
export async function deleteUser(userId, masterPassword) {
  try {
    // Check master password
    if (masterPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return { error: "Invalid master admin password" }
    }

    // First delete all user's cooks
    await sql`DELETE FROM "Cook" WHERE "userId" = ${userId}`

    // Delete all user's messages
    await sql`DELETE FROM "Message" WHERE "userId" = ${userId}`

    // Delete all trades involving this user
    await sql`DELETE FROM "Trade" WHERE "fromUserId" = ${userId} OR "toUserId" = ${userId}`

    // Finally delete the user
    await sql`DELETE FROM "User" WHERE id = ${userId}`

    return { success: true }
  } catch (error) {
    console.error("Delete user error:", error)
    return { error: "Failed to delete user" }
  }
}

// Authenticate admin user
export async function authenticateAdminUser(username, password) {
  try {
    const bcrypt = require("bcryptjs")

    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username} AND "isAdmin" = true
    `

    if (users.length === 0) {
      return { error: "Invalid credentials or user is not an admin" }
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return { error: "This admin account has been banned" }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return { error: "Invalid credentials" }
    }

    return { success: true, user: { id: user.id, name: user.name, username: user.username } }
  } catch (error) {
    console.error("Admin user authentication error:", error)
    return { error: "Authentication failed" }
  }
}

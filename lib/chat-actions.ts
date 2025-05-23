"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Maximum number of messages to keep
const MAX_MESSAGES = 5000

// Send a new message
export async function sendMessage(formData: FormData) {
  try {
    const content = formData.get("message") as string
    const userId = formData.get("userId") as string

    if (!content?.trim() || !userId) {
      return { error: "Message cannot be empty" }
    }

    // Check current message count
    const countResult = await sql`SELECT COUNT(*) as count FROM "Message"`
    const currentCount = Number.parseInt(countResult[0].count)

    // Check if we've reached the message limit
    if (currentCount >= MAX_MESSAGES) {
      return { error: "Chat limit reached, contact Wes G" }
    }

    // Insert the new message
    await sql`
      INSERT INTO "Message" (id, content, "userId", "createdAt")
      VALUES (${crypto.randomUUID()}, ${content}, ${userId}, NOW())
    `

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Send message error:", error)
    return { error: "Failed to send message" }
  }
}

// Get recent messages with user info
export async function getRecentMessages(limit = 50) {
  try {
    const messages = await sql`
      SELECT 
        m.id, 
        m.content, 
        m."userId", 
        m."createdAt",
        u.name as "userName"
      FROM "Message" m
      JOIN "User" u ON m."userId" = u.id
      ORDER BY m."createdAt" DESC
      LIMIT ${limit}
    `

    // Return messages in chronological order (oldest first)
    return messages.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      userName: msg.userName,
      createdAt: new Date(msg.createdAt).toISOString(),
    }))
  } catch (error) {
    console.error("Get messages error:", error)
    return []
  }
}

// Get message count
export async function getMessageCount() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM "Message"`
    return Number.parseInt(result[0].count)
  } catch (error) {
    console.error("Get message count error:", error)
    return 0
  }
}

// Check if chat limit is reached
export async function isChatLimitReached() {
  try {
    const count = await getMessageCount()
    return count >= MAX_MESSAGES
  } catch (error) {
    console.error("Check chat limit error:", error)
    return false
  }
}

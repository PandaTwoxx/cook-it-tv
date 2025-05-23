"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { MessageSquare } from "lucide-react"
import Link from "next/link"
import { getRecentMessages } from "@/lib/chat-actions"

export function ChatNotification() {
  const { data: session } = useSession()
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [lastChecked, setLastChecked] = useState(Date.now())

  useEffect(() => {
    if (!session?.user) return

    const checkNewMessages = async () => {
      try {
        const messages = await getRecentMessages(5)

        // Check if there are any messages newer than last checked
        const hasNew = messages.some(
          (msg) => new Date(msg.createdAt).getTime() > lastChecked && msg.userId !== session.user.id,
        )

        setHasNewMessages(hasNew)
      } catch (error) {
        console.error("Failed to check messages:", error)
      }
    }

    // Check for new messages every 30 seconds
    checkNewMessages()
    const interval = setInterval(checkNewMessages, 30000)

    return () => clearInterval(interval)
  }, [session, lastChecked])

  const handleClick = () => {
    setHasNewMessages(false)
    setLastChecked(Date.now())
  }

  return (
    <Link href="/chat" className="relative text-muted-foreground hover:text-foreground" onClick={handleClick}>
      <MessageSquare className="h-5 w-5" />
      {hasNewMessages && <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />}
    </Link>
  )
}

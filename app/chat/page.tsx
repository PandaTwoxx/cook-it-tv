"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getRecentMessages, sendMessage, getMessageCount, isChatLimitReached } from "@/lib/chat-actions"

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const [error, setError] = useState("")
  const [messageCount, setMessageCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const [data, count, isLimitReached] = await Promise.all([
          getRecentMessages(50),
          getMessageCount(),
          isChatLimitReached(),
        ])
        setMessages(data)
        setMessageCount(count)
        setLimitReached(isLimitReached)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
        setError("Failed to load messages")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      fetchMessages()

      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user?.id) return

    try {
      const formData = new FormData()
      formData.append("message", newMessage)
      formData.append("userId", session.user.id)

      const result = await sendMessage(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      // Optimistically update UI
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          content: newMessage,
          userId: session.user.id,
          userName: session.user.name,
          createdAt: new Date().toISOString(),
        },
      ])

      setNewMessage("")

      // Fetch latest messages to ensure consistency
      const [updatedMessages, count, isLimitReached] = await Promise.all([
        getRecentMessages(50),
        getMessageCount(),
        isChatLimitReached(),
      ])
      setMessages(updatedMessages)
      setMessageCount(count)
      setLimitReached(isLimitReached)
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message")
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center text-sm hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
        </Link>
        <div className="text-sm text-muted-foreground">Messages: {messageCount} / 5000</div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Cook'it Community Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>
          )}

          {limitReached && (
            <div className="p-3 mb-4 text-sm bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-md flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Chat limit reached (5000 messages). Contact Wes G to clear messages.
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-4 h-[400px] overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No messages yet. Be the first to say hello!</div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.userId === session.user.id ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.userId === session.user.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1">
                        {msg.userId === session.user.id ? "You" : msg.userName}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="w-full flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={limitReached ? "Chat limit reached" : "Type your message..."}
              className="flex-1"
              disabled={limitReached}
            />
            <Button type="submit" disabled={!newMessage.trim() || limitReached}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}

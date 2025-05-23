"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ArrowRight, Check, X, Plus } from "lucide-react"
import Link from "next/link"
import { getUserTrades, acceptTrade, declineTrade } from "@/lib/trade-actions"

export default function TradesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trades, setTrades] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingTrade, setProcessingTrade] = useState(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchTrades = async () => {
      if (session?.user?.id) {
        try {
          const data = await getUserTrades(session.user.id)
          setTrades(data)
        } catch (error) {
          console.error("Failed to fetch trades:", error)
          setError("Failed to load trades")
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchTrades()
  }, [session])

  const handleAcceptTrade = async (tradeId) => {
    setProcessingTrade(tradeId)
    try {
      const result = await acceptTrade(tradeId, session.user.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh trades
        const updatedTrades = await getUserTrades(session.user.id)
        setTrades(updatedTrades)
      }
    } catch (error) {
      setError("Failed to accept trade")
    } finally {
      setProcessingTrade(null)
    }
  }

  const handleDeclineTrade = async (tradeId) => {
    setProcessingTrade(tradeId)
    try {
      const result = await declineTrade(tradeId, session.user.id)
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh trades
        const updatedTrades = await getUserTrades(session.user.id)
        setTrades(updatedTrades)
      }
    } catch (error) {
      setError("Failed to decline trade")
    } finally {
      setProcessingTrade(null)
    }
  }

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "Secret":
        return "text-purple-500"
      case "Michelin":
        return "text-red-500"
      case "Exotic":
        return "text-yellow-500"
      case "5-star":
        return "text-blue-500"
      case "Epic":
        return "text-green-500"
      case "Rare":
        return "text-teal-500"
      case "Uncommon":
        return "text-gray-500"
      default:
        return ""
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "declined":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
    return null
  }

  const receivedTrades = trades.filter((trade) => !trade.isSentByUser && trade.status === "pending")
  const sentTrades = trades.filter((trade) => trade.isSentByUser)
  const completedTrades = trades.filter((trade) => trade.status !== "pending")

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center text-sm hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
        </Link>
        <Button asChild>
          <Link href="/trades/new">
            <Plus className="h-4 w-4 mr-2" />
            New Trade
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cook Trading</h1>
        <p className="text-muted-foreground">Trade your cooks with other players</p>
      </div>

      {error && <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

      <Tabs defaultValue="received">
        <TabsList className="mb-6">
          <TabsTrigger value="received">Received ({receivedTrades.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentTrades.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedTrades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <div className="space-y-4">
            {receivedTrades.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No pending trade offers</p>
                </CardContent>
              </Card>
            ) : (
              receivedTrades.map((trade) => (
                <Card key={trade.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Trade from {trade.fromUserName}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">You give</div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">{trade.toCook.icon || "👨‍🍳"}</div>
                          <div className={`font-medium ${getRarityColor(trade.toCook.rarity)}`}>
                            {trade.toCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{trade.toCook.rarity}</div>
                        </div>
                      </div>

                      <ArrowRight className="h-6 w-6 text-muted-foreground mx-4" />

                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">You get</div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">{trade.fromCook.icon || "👨‍🍳"}</div>
                          <div className={`font-medium ${getRarityColor(trade.fromCook.rarity)}`}>
                            {trade.fromCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{trade.fromCook.rarity}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleAcceptTrade(trade.id)}
                        disabled={processingTrade === trade.id}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeclineTrade(trade.id)}
                        disabled={processingTrade === trade.id}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sent">
          <div className="space-y-4">
            {sentTrades.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No sent trade offers</p>
                </CardContent>
              </Card>
            ) : (
              sentTrades.map((trade) => (
                <Card key={trade.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Trade to {trade.toUserName}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">You offer</div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">{trade.fromCook.icon || "👨‍🍳"}</div>
                          <div className={`font-medium ${getRarityColor(trade.fromCook.rarity)}`}>
                            {trade.fromCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{trade.fromCook.rarity}</div>
                        </div>
                      </div>

                      <ArrowRight className="h-6 w-6 text-muted-foreground mx-4" />

                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">For their</div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">{trade.toCook.icon || "👨‍🍳"}</div>
                          <div className={`font-medium ${getRarityColor(trade.toCook.rarity)}`}>
                            {trade.toCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{trade.toCook.rarity}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {completedTrades.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No completed trades</p>
                </CardContent>
              </Card>
            ) : (
              completedTrades.map((trade) => (
                <Card key={trade.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        {trade.isSentByUser ? `Trade to ${trade.toUserName}` : `Trade from ${trade.fromUserName}`}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">
                          {trade.isSentByUser ? "You offered" : "You gave"}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">
                            {trade.isSentByUser ? trade.fromCook.icon : trade.toCook.icon || "👨‍🍳"}
                          </div>
                          <div
                            className={`font-medium ${getRarityColor(trade.isSentByUser ? trade.fromCook.rarity : trade.toCook.rarity)}`}
                          >
                            {trade.isSentByUser ? trade.fromCook.name : trade.toCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {trade.isSentByUser ? trade.fromCook.rarity : trade.toCook.rarity}
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="h-6 w-6 text-muted-foreground mx-4" />

                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">
                          {trade.isSentByUser ? "For their" : "You got"}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl mb-2">
                            {trade.isSentByUser ? trade.toCook.icon : trade.fromCook.icon || "👨‍🍳"}
                          </div>
                          <div
                            className={`font-medium ${getRarityColor(trade.isSentByUser ? trade.toCook.rarity : trade.fromCook.rarity)}`}
                          >
                            {trade.isSentByUser ? trade.toCook.name : trade.fromCook.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {trade.isSentByUser ? trade.toCook.rarity : trade.fromCook.rarity}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

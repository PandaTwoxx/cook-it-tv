"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ChefHat, Coins } from "lucide-react"
import Link from "next/link"
import { getUserData, sellCook } from "@/lib/user-actions"
import { useSession } from "next-auth/react"

export default function InventoryPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState("")
  const [sellingCook, setSellingCook] = useState(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.username) {
        try {
          const data = await getUserData(session.user.username)
          setUserData(data)
          setIsLoading(false)
        } catch (error) {
          setError("Failed to load user data")
          setIsLoading(false)
        }
      }
    }

    fetchUserData()
  }, [session])

  const handleSellCook = async (cookId) => {
    setSellingCook(cookId)
    try {
      const result = await sellCook(session.user.username, cookId)
      if (result.error) {
        setError(result.error)
        return
      }

      // Update user data
      const updatedData = await getUserData(session.user.username)
      setUserData(updatedData)
    } catch (error) {
      setError("Failed to sell cook. Please try again.")
    } finally {
      setSellingCook(null)
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

  const getRarityBgColor = (rarity) => {
    switch (rarity) {
      case "Secret":
        return "bg-purple-50"
      case "Michelin":
        return "bg-red-50"
      case "Exotic":
        return "bg-yellow-50"
      case "5-star":
        return "bg-blue-50"
      case "Epic":
        return "bg-green-50"
      case "Rare":
        return "bg-teal-50"
      case "Uncommon":
        return "bg-gray-50"
      default:
        return "bg-gray-50"
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center text-sm hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
        </Link>
        <div className="text-sm font-medium">
          Your tokens: <span className="text-orange-500 font-bold">{userData.tokens}</span>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Inventory</h1>
        <p className="text-muted-foreground">Manage your collection of cooks</p>
      </div>

      {error && <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

      {userData.inventory.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex justify-center mb-4">
              <ChefHat className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-medium mb-2">Your inventory is empty</h3>
            <p className="text-muted-foreground mb-6">Open packs in the shop to collect cooks</p>
            <Button asChild>
              <Link href="/shop">Go to Shop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {userData.inventory.map((cook) => (
            <Card key={cook.id} className="overflow-hidden">
              <div className={`h-2 ${getRarityBgColor(cook.rarity)}`}></div>
              <CardHeader className="pb-2">
                <CardTitle className={`text-xl ${getRarityColor(cook.rarity)}`}>{cook.name}</CardTitle>
                <CardDescription>{cook.rarity} Rarity</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex justify-center mb-4">
                  <div
                    className={`w-20 h-20 ${getRarityBgColor(cook.rarity)} rounded-full flex items-center justify-center`}
                  >
                    <span className="text-4xl">{cook.icon || "👨‍🍳"}</span>
                  </div>
                </div>
                <div className="text-sm text-center">
                  <div className="flex items-center justify-center gap-1 font-medium">
                    <Coins className="h-4 w-4" />
                    <span>Sell value: {cook.sellValue} tokens</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSellCook(cook.id)}
                  disabled={sellingCook === cook.id}
                >
                  {sellingCook === cook.id ? "Selling..." : `Sell for ${cook.sellValue} tokens`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

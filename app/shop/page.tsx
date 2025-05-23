"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ArrowLeft, Sparkles, AlertCircle } from "lucide-react"
import Link from "next/link"
import { getUserData, openPack } from "@/lib/user-actions"
import { useSession } from "next-auth/react"
import { cookRarities } from "@/lib/game-config"

export default function ShopPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [openingPack, setOpeningPack] = useState(false)
  const [packResult, setPackResult] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.username) {
        try {
          const data = await getUserData(session.user.username)
          if (data.error) {
            setError(data.error)
          } else {
            setUserData(data)
          }
          setIsLoading(false)
        } catch (error) {
          console.error("Failed to fetch user data:", error)
          setError("Failed to load user data")
          setIsLoading(false)
        }
      }
    }

    fetchUserData()
  }, [session])

  const handleOpenPack = async () => {
    if (!session?.user?.username) {
      setError("Please log in to open packs")
      return
    }

    if (userData.tokens < 25) {
      setError("Not enough tokens to open a pack")
      return
    }

    setOpeningPack(true)
    setError("")

    try {
      const result = await openPack(session.user.username, "og")

      if (result.error) {
        setError(result.error)
        setOpeningPack(false)
        return
      }

      if (!result.success) {
        setError("Failed to open pack. Please try again.")
        setOpeningPack(false)
        return
      }

      // Success - show the result
      setPackResult(result)

      // Update user data to reflect new token balance
      try {
        const updatedData = await getUserData(session.user.username)
        if (updatedData && !updatedData.error) {
          setUserData(updatedData)
        }
      } catch (updateError) {
        console.error("Failed to update user data after pack opening:", updateError)
        // Don't show error to user as pack opening was successful
      }
    } catch (error) {
      console.error("Pack opening error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setOpeningPack(false)
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

  const clearError = () => {
    setError("")
  }

  const clearResult = () => {
    setPackResult(null)
    setError("")
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading shop...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8">
            <p className="mb-4">Please log in to access the shop</p>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="mb-4">Failed to load user data</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
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

      {error && (
        <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={clearError}>
            ×
          </Button>
        </div>
      )}

      {packResult ? (
        <Card className="shadow-lg mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 h-3"></div>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Pack Opening Result
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </CardTitle>
            <CardDescription>You got a new cook!</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className={`text-3xl font-bold mb-2 ${getRarityColor(packResult.rarity)}`}>{packResult.name}</div>
            <div className="text-sm text-muted-foreground mb-4">{packResult.rarity} Rarity</div>
            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-5xl">{packResult.icon || "👨‍🍳"}</span>
            </div>
            <div className="text-sm text-center max-w-md">
              <p className="font-medium">Sell value: {packResult.sellValue} tokens</p>
              <p className="text-muted-foreground mt-1">Drop rate: {packResult.dropRate}%</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={clearResult}>Open Another Pack</Button>
            <Button variant="outline" onClick={() => router.push("/inventory")}>
              View Inventory
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>OG Pack</CardTitle>
              <CardDescription>Contains one random cook with various rarities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-orange-50 rounded-lg p-4 mb-4">
                <div className="text-xl font-bold mb-2 text-black">25 tokens</div>
                <div className="text-sm text-muted-foreground">Collect all the OG cooks!</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={getRarityColor("Secret")}>Secret (OG party)</span>
                  <span>0.0003%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("Michelin")}>Michelin (2)</span>
                  <span>0.00475%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("Exotic")}>Exotic (2)</span>
                  <span>0.04%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("5-star")}>5-star (1)</span>
                  <span>0.31%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("Epic")}>Epic (2)</span>
                  <span>2.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("Rare")}>Rare (2)</span>
                  <span>10%</span>
                </div>
                <div className="flex justify-between">
                  <span className={getRarityColor("Uncommon")}>Uncommon (4)</span>
                  <span>18.75%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleOpenPack}
                disabled={userData.tokens < 25 || openingPack}
              >
                {openingPack ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opening...
                  </div>
                ) : (
                  "Open Pack (25 tokens)"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md bg-gray-50 border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground">Coming Soon</CardTitle>
              <CardDescription>More packs will be available in the future</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pack Odds</CardTitle>
          <CardDescription>Detailed information about the OG Pack</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
              <div>Rarity</div>
              <div>Cook</div>
              <div className="text-right">Sell Value</div>
            </div>

            {cookRarities.map((rarity, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 text-sm border-b pb-2 last:border-0">
                <div className={getRarityColor(rarity.type)}>{rarity.type}</div>
                <div>{rarity.cooks.join(", ")}</div>
                <div className="text-right">{rarity.sellValue} tokens</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

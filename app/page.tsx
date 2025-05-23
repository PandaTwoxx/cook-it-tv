"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Package, Users, MessageSquare, Trophy, Settings, Shield } from "lucide-react"
import Link from "next/link"
import { getUserData } from "@/lib/user-actions"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    const fetchUserData = async () => {
      try {
        if (session.user?.username) {
          const data = await getUserData(session.user.username)
          if (data.error) {
            setError(data.error)
          } else {
            setUserData(data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [session, status, router])

  if (status === "loading" || isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Unable to load user data. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center justify-center mb-12 text-center">
        <div className="bg-primary/10 rounded-full p-4 mb-6">
          <span className="text-4xl">👨‍🍳</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Cook'it
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Collect tokens daily and open packs to discover rare cooks!
        </p>
        <p className="text-sm text-muted-foreground mt-2 bg-card/50 px-4 py-2 rounded-full border">
          Welcome back, <span className="font-medium text-primary">{session.user.name}</span>!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Coins className="h-5 w-5" />
              Daily Tokens
            </CardTitle>
            <CardDescription>Claim your daily tokens once every 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-primary">{userData.tokens} Tokens</div>
            <p className="text-sm text-muted-foreground">
              {userData.canClaim
                ? "✨ You can claim your daily tokens now!"
                : `⏰ Next claim available in ${userData.nextClaimTime}`}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={!userData.canClaim} asChild>
              <Link href="/claim">
                <Coins className="h-4 w-4 mr-2" />
                Claim Daily Tokens
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-card to-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Package className="h-5 w-5" />
              Open Packs
            </CardTitle>
            <CardDescription>Spend your tokens to open packs and collect cooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-primary">OG Pack</div>
            <p className="text-sm text-muted-foreground">
              25 tokens per pack. Discover rare cooks with unique abilities!
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={userData.tokens < 25} asChild>
              <Link href="/shop">
                <Package className="h-4 w-4 mr-2" />
                Go to Shop
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Link href="/inventory" className="block">
          <Card className="h-full hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">🎒</span>
              </div>
              <CardTitle className="text-lg">Inventory</CardTitle>
              <CardDescription className="text-sm">View your collection</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/shop" className="block">
          <Card className="h-full hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Shop</CardTitle>
              <CardDescription className="text-sm">Open packs</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/leaderboard" className="block">
          <Card className="h-full hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Leaderboard</CardTitle>
              <CardDescription className="text-sm">Top collectors</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/trades" className="block">
          <Card className="h-full hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Trades</CardTitle>
              <CardDescription className="text-sm">Trade cooks</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/chat" className="block">
          <Card className="h-full hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Chat</CardTitle>
              <CardDescription className="text-sm">Connect with players</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Settings and Admin buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <Link href="/settings" className="block">
          <Card className="hover:shadow-md transition-all duration-200 hover:scale-105 border-primary/10 hover:border-primary/30">
            <CardHeader className="text-center pb-2 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base">Settings</CardTitle>
                  <CardDescription className="text-xs">Manage your account</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {userData.isAdmin && (
          <Link href="/admin" className="block">
            <Card className="hover:shadow-md transition-all duration-200 hover:scale-105 border-purple-200 hover:border-purple-400 bg-white">
              <CardHeader className="text-center pb-2 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 w-10 h-10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base text-purple-700">Admin Panel</CardTitle>
                    <CardDescription className="text-xs text-purple-600">Manage the game</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-card/50 backdrop-blur rounded-lg p-6 border border-primary/20">
          <h2 className="text-xl font-semibold mb-2 text-primary">Your Collection Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary">{userData.inventory?.length || 0}</div>
              <div className="text-muted-foreground">Total Cooks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{userData.tokens}</div>
              <div className="text-muted-foreground">Tokens</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {userData.inventory?.reduce((sum, cook) => sum + cook.sellValue, 0) || 0}
              </div>
              <div className="text-muted-foreground">Collection Value</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

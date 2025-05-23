"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { claimDailyTokens, getUserData } from "@/lib/user-actions"
import { useSession } from "next-auth/react"

export default function ClaimPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [claimAmount, setClaimAmount] = useState(null)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState("")

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

  const handleClaim = async () => {
    setIsLoading(true)
    try {
      const result = await claimDailyTokens(session.user.username)
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      setClaimAmount(result.amount)
      setClaimed(true)
      // Update user data
      const updatedData = await getUserData(session.user.username)
      setUserData(updatedData)
      setIsLoading(false)
    } catch (error) {
      setError("Failed to claim tokens. Please try again.")
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <Link href="/" className="flex items-center text-sm mb-8 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
      </Link>

      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Coins className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Daily Token Claim</CardTitle>
          <CardDescription>Claim your tokens once every 24 hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

          {claimed ? (
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-orange-500 mb-2">+{claimAmount}</div>
              <p className="text-lg mb-4">Tokens claimed successfully!</p>
              <div className="text-sm text-muted-foreground">
                You now have <span className="font-bold">{userData.tokens} tokens</span> in total
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              {userData.canClaim ? (
                <div className="space-y-4">
                  <p className="text-lg">You can claim between 500-1500 tokens</p>
                  <div className="text-sm text-muted-foreground mb-4">
                    Current balance: <span className="font-bold">{userData.tokens} tokens</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">You've already claimed today</p>
                  <div className="text-sm">
                    Next claim available in: <span className="font-bold">{userData.nextClaimTime}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Current balance: <span className="font-bold">{userData.tokens} tokens</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          {claimed ? (
            <Button className="w-full" onClick={() => router.push("/shop")}>
              Go to Shop
            </Button>
          ) : (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={handleClaim}
              disabled={!userData.canClaim || isLoading}
            >
              {isLoading ? "Processing..." : "Claim Daily Tokens"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

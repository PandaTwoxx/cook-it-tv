"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getUsersWithCooks, getUserCooks, createTrade } from "@/lib/trade-actions"
import { getUserData } from "@/lib/user-actions"

export default function NewTradePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [myCooks, setMyCooks] = useState([])
  const [theirCooks, setTheirCooks] = useState([])
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedMyCook, setSelectedMyCook] = useState("")
  const [selectedTheirCook, setSelectedTheirCook] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.id) {
        try {
          const [usersData, myData] = await Promise.all([getUsersWithCooks(), getUserData(session.user.username)])

          // Filter out current user from the list
          const filteredUsers = usersData.filter((user) => user.id !== session.user.id)
          setUsers(filteredUsers)
          setMyCooks(myData.inventory || [])
        } catch (error) {
          console.error("Failed to fetch data:", error)
          setError("Failed to load data")
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchData()
  }, [session])

  useEffect(() => {
    const fetchTheirCooks = async () => {
      if (selectedUser) {
        try {
          const cooks = await getUserCooks(selectedUser)
          setTheirCooks(cooks)
        } catch (error) {
          console.error("Failed to fetch their cooks:", error)
          setError("Failed to load their cooks")
        }
      } else {
        setTheirCooks([])
      }
    }

    fetchTheirCooks()
  }, [selectedUser])

  const handleSubmit = async () => {
    if (!selectedUser || !selectedMyCook || !selectedTheirCook) {
      setError("Please select all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createTrade(session.user.id, selectedUser, selectedMyCook, selectedTheirCook)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/trades")
      }
    } catch (error) {
      setError("Failed to create trade")
    } finally {
      setIsSubmitting(false)
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

  const selectedMyCookData = myCooks.find((cook) => cook.id === selectedMyCook)
  const selectedTheirCookData = theirCooks.find((cook) => cook.id === selectedTheirCook)

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <Link href="/trades" className="flex items-center text-sm hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to trades
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Trade</h1>
        <p className="text-muted-foreground">Propose a trade with another player</p>
      </div>

      {error && <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Trading Partner</CardTitle>
            <CardDescription>Choose who you want to trade with</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.cookCount} cooks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Cook</CardTitle>
              <CardDescription>Select a cook to offer</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedMyCook} onValueChange={setSelectedMyCook}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your cook" />
                </SelectTrigger>
                <SelectContent>
                  {myCooks.map((cook) => (
                    <SelectItem key={cook.id} value={cook.id}>
                      {cook.icon} {cook.name} ({cook.rarity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedMyCookData && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">{selectedMyCookData.icon || "👨‍🍳"}</div>
                  <div className={`font-medium ${getRarityColor(selectedMyCookData.rarity)}`}>
                    {selectedMyCookData.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedMyCookData.rarity}</div>
                  <div className="text-sm text-muted-foreground">Value: {selectedMyCookData.sellValue} tokens</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Their Cook</CardTitle>
              <CardDescription>Select a cook you want</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTheirCook} onValueChange={setSelectedTheirCook} disabled={!selectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedUser ? "Select their cook" : "Select a player first"} />
                </SelectTrigger>
                <SelectContent>
                  {theirCooks.map((cook) => (
                    <SelectItem key={cook.id} value={cook.id}>
                      {cook.icon} {cook.name} ({cook.rarity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTheirCookData && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">{selectedTheirCookData.icon || "👨‍🍳"}</div>
                  <div className={`font-medium ${getRarityColor(selectedTheirCookData.rarity)}`}>
                    {selectedTheirCookData.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedTheirCookData.rarity}</div>
                  <div className="text-sm text-muted-foreground">Value: {selectedTheirCookData.sellValue} tokens</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedMyCookData && selectedTheirCookData && (
          <Card>
            <CardHeader>
              <CardTitle>Trade Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">You give</div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">{selectedMyCookData.icon || "👨‍🍳"}</div>
                    <div className={`font-medium ${getRarityColor(selectedMyCookData.rarity)}`}>
                      {selectedMyCookData.name}
                    </div>
                  </div>
                </div>

                <ArrowRight className="h-6 w-6 text-muted-foreground" />

                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">You get</div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl mb-2">{selectedTheirCookData.icon || "👨‍🍳"}</div>
                    <div className={`font-medium ${getRarityColor(selectedTheirCookData.rarity)}`}>
                      {selectedTheirCookData.name}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || !selectedMyCook || !selectedTheirCook || isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? "Creating Trade..." : "Create Trade Offer"}
          </Button>
        </div>
      </div>
    </div>
  )
}

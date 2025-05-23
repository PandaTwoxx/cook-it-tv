"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Trophy, Medal } from "lucide-react"
import Link from "next/link"
import { getAllUsers } from "@/lib/admin-actions"

export default function LeaderboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers()
        // Sort by cook count (descending)
        const sortedUsers = data.sort((a, b) => b.cookCount - a.cookCount)
        setUsers(sortedUsers)
        setIsLoading(false)
      } catch (error) {
        setError("Failed to load leaderboard data")
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" />
      default:
        return null
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
      <Link href="/" className="flex items-center text-sm mb-8 hover:underline">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">See who has the most impressive cook collection</p>
      </div>

      {error && <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Top Collectors</CardTitle>
          <CardDescription>Ranked by number of cooks in collection</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Cooks</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No data available yet
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {getRankIcon(index)}
                        <span className="ml-1">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell className="text-right">{user.cookCount}</TableCell>
                    <TableCell className="text-right">{user.tokens}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

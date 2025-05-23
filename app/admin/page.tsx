"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Shield, User, Coins, Database, MessageSquare } from "lucide-react"
import {
  getAllUsers,
  updateUserTokens,
  grantAdminAccess,
  removeAdminAccess,
  executeSQL,
  deleteOldestMessages,
  clearAllMessages,
  deleteUser,
  authenticateAdminUser,
} from "@/lib/admin-actions"
import { getMessageCount } from "@/lib/chat-actions"

export default function AdminPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState("password") // "password" or "user"
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [messageCount, setMessageCount] = useState(0)
  const [authenticatedUser, setAuthenticatedUser] = useState(null)

  // Form states
  const [selectedUser, setSelectedUser] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [adminUsername, setAdminUsername] = useState("")
  const [sqlQuery, setSqlQuery] = useState("")
  const [sqlResult, setSqlResult] = useState(null)
  const [deleteCount, setDeleteCount] = useState(100)

  useEffect(() => {
    // Check if admin is authenticated in session storage
    const storedAuth = sessionStorage.getItem("adminAuth")
    const storedUser = sessionStorage.getItem("adminUser")
    if (storedAuth === "true") {
      setIsAuthenticated(true)
      if (storedUser) {
        setAuthenticatedUser(JSON.parse(storedUser))
      }
      fetchUsers()
      fetchMessageCount()
    }
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      setError("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessageCount = async () => {
    try {
      const count = await getMessageCount()
      setMessageCount(count)
    } catch (error) {
      console.error("Failed to get message count:", error)
    }
  }

  const handleAuthenticate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (authMethod === "password") {
        // Check if password matches the one in environment variables
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
          setIsAuthenticated(true)
          sessionStorage.setItem("adminAuth", "true")
          await fetchUsers()
          await fetchMessageCount()
        } else {
          setError("Invalid admin password")
        }
      } else {
        // Authenticate with admin user credentials
        const result = await authenticateAdminUser(username, userPassword)
        if (result.error) {
          setError(result.error)
        } else {
          setIsAuthenticated(true)
          setAuthenticatedUser(result.user)
          sessionStorage.setItem("adminAuth", "true")
          sessionStorage.setItem("adminUser", JSON.stringify(result.user))
          await fetchUsers()
          await fetchMessageCount()
        }
      }
    } catch (error) {
      setError("Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTokens = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!selectedUser || !tokenAmount) {
        setError("Please select a user and enter a token amount")
        setIsLoading(false)
        return
      }

      const result = await updateUserTokens(selectedUser, Number.parseInt(tokenAmount))
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully updated tokens for ${selectedUser}`)
        await fetchUsers()
        setSelectedUser("")
        setTokenAmount("")
      }
    } catch (error) {
      setError("Failed to update tokens")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGrantAdmin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!adminUsername) {
        setError("Please enter a username")
        setIsLoading(false)
        return
      }

      const result = await grantAdminAccess(adminUsername)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully granted admin access to ${adminUsername}`)
        await fetchUsers()
        setAdminUsername("")
      }
    } catch (error) {
      setError("Failed to grant admin access")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAdmin = async (username) => {
    if (!window.confirm(`Are you sure you want to remove admin access from ${username}?`)) {
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await removeAdminAccess(username)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully removed admin access from ${username}`)
        await fetchUsers()
      }
    } catch (error) {
      setError("Failed to remove admin access")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteSQL = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    setSqlResult(null)

    try {
      if (!sqlQuery.trim()) {
        setError("Please enter a SQL query")
        setIsLoading(false)
        return
      }

      const result = await executeSQL(sqlQuery)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess("SQL executed successfully")
        setSqlResult(result.result)
        await fetchUsers()
        await fetchMessageCount()
      }
    } catch (error) {
      setError("Failed to execute SQL")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMessages = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await deleteOldestMessages(deleteCount)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully deleted ${result.count} oldest messages`)
        await fetchMessageCount()
      }
    } catch (error) {
      setError("Failed to delete messages")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAllMessages = async () => {
    if (!window.confirm("Are you sure you want to delete ALL messages? This cannot be undone.")) {
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await clearAllMessages()
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess("Successfully cleared all messages")
        await fetchMessageCount()
      }
    } catch (error) {
      setError("Failed to clear messages")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${userName}"? This will permanently delete all their data including cooks, messages, and trades. This action cannot be undone.`,
      )
    ) {
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await deleteUser(userId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully deleted user "${userName}"`)
        await fetchUsers()
      }
    } catch (error) {
      setError("Failed to delete user")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAuthenticatedUser(null)
    sessionStorage.removeItem("adminAuth")
    sessionStorage.removeItem("adminUser")
    setPassword("")
    setUsername("")
    setUserPassword("")
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-gray-500" />
            </div>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Choose your authentication method</CardDescription>
          </CardHeader>
          <form onSubmit={handleAuthenticate}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>
              )}

              <div className="space-y-3">
                <Label>Authentication Method</Label>
                <RadioGroup value={authMethod} onValueChange={setAuthMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password">Admin Password</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="user" />
                    <Label htmlFor="user">Admin User Account</Label>
                  </div>
                </RadioGroup>
              </div>

              {authMethod === "password" ? (
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adminUsername">Username</Label>
                    <Input
                      id="adminUsername"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminUserPassword">Password</Label>
                    <Input
                      id="adminUserPassword"
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Cook'it Admin Panel</h1>
          {authenticatedUser && <p className="text-sm text-muted-foreground">Logged in as: {authenticatedUser.name}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Game
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {error && <div className="p-3 mb-6 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">{error}</div>}

      {success && (
        <div className="p-3 mb-6 text-sm bg-green-50 border border-green-200 text-green-600 rounded-md">{success}</div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Coins className="h-4 w-4 mr-2" />
            Manage Tokens
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Shield className="h-4 w-4 mr-2" />
            Admin Access
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cooks</TableHead>
                      <TableHead>Last Claim</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.tokens}</TableCell>
                        <TableCell>{user.cookCount}</TableCell>
                        <TableCell>{user.lastClaim || "Never"}</TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              User
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.isAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAdmin(user.username)}
                                disabled={isLoading}
                              >
                                Remove Admin
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => grantAdminAccess(user.username).then(() => fetchUsers())}
                                disabled={isLoading}
                              >
                                Make Admin
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={isLoading}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={fetchUsers} variant="outline">
                Refresh Users
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Manage User Tokens</CardTitle>
              <CardDescription>Add or remove tokens from a user's account</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateTokens}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Select User</Label>
                  <select
                    id="user"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.username}>
                        {user.name} ({user.username}) - Current: {user.tokens} tokens
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokens">Token Amount (positive to add, negative to remove)</Label>
                  <Input
                    id="tokens"
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    placeholder="e.g. 500 or -100"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Tokens"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Grant Admin Access</CardTitle>
              <CardDescription>Give admin privileges to a user</CardDescription>
            </CardHeader>
            <form onSubmit={handleGrantAdmin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminUsername">Username</Label>
                  <Input
                    id="adminUsername"
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="username"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Granting Access..." : "Grant Admin Access"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Execute SQL</CardTitle>
              <CardDescription>Run custom SQL queries on the database</CardDescription>
            </CardHeader>
            <form onSubmit={handleExecuteSQL}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sqlQuery">SQL Query</Label>
                  <Textarea
                    id="sqlQuery"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM User LIMIT 10"
                    className="font-mono h-32"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Be careful with SQL queries. They will be executed directly on the database.
                  </p>
                </div>

                {sqlResult && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Result:</h3>
                    <div className="bg-muted p-4 rounded-md overflow-auto max-h-64">
                      <pre className="text-xs">{JSON.stringify(sqlResult, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Executing..." : "Execute SQL"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat Management</CardTitle>
              <CardDescription>Manage chat messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <div>
                  <h3 className="font-medium">Current Message Count</h3>
                  <p className="text-2xl font-bold">{messageCount} / 5000</p>
                </div>
                <Button variant="outline" onClick={fetchMessageCount}>
                  Refresh Count
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Delete Oldest Messages</h3>
                <div className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="deleteCount">Number of messages to delete</Label>
                    <Input
                      id="deleteCount"
                      type="number"
                      min="1"
                      max={messageCount}
                      value={deleteCount}
                      onChange={(e) => setDeleteCount(Number(e.target.value))}
                    />
                  </div>
                  <Button onClick={handleDeleteMessages} disabled={isLoading || messageCount === 0}>
                    {isLoading ? "Deleting..." : "Delete Oldest Messages"}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Clear All Messages</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete all chat messages. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAllMessages}
                  disabled={isLoading || messageCount === 0}
                >
                  {isLoading ? "Clearing..." : "Clear All Messages"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, User, Coins, Database, MessageSquare, Ban, UserX } from "lucide-react"
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
  banUser,
  unbanUser,
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
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)

  // Form states
  const [selectedUser, setSelectedUser] = useState("")
  const [tokenAmount, setTokenAmount] = useState("")
  const [adminUsername, setAdminUsername] = useState("")
  const [sqlQuery, setSqlQuery] = useState("")
  const [sqlResults, setSqlResults] = useState(null)
  const [deleteCount, setDeleteCount] = useState(100)

  // Dialog states
  const [masterPasswordDialog, setMasterPasswordDialog] = useState(false)
  const [masterPassword, setMasterPassword] = useState("")
  const [pendingAction, setPendingAction] = useState(null)

  useEffect(() => {
    // Check if admin is authenticated in session storage
    const storedAuth = sessionStorage.getItem("adminAuth")
    const storedUser = sessionStorage.getItem("adminUser")
    const storedMaster = sessionStorage.getItem("masterAdmin")
    if (storedAuth === "true") {
      setIsAuthenticated(true)
      setIsMasterAdmin(storedMaster === "true")
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
          setIsMasterAdmin(true)
          sessionStorage.setItem("adminAuth", "true")
          sessionStorage.setItem("masterAdmin", "true")
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
          setIsMasterAdmin(false)
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

  // Update the handleBanUser function to check if the user is an admin
  const handleBanUser = async (username, isAdmin) => {
    if (!window.confirm(`Are you sure you want to ban user "${username}"?`)) {
      return
    }

    // If the user is an admin and current user is not master admin, require master password
    if (isAdmin && !isMasterAdmin) {
      setPendingAction({
        action: banUser,
        params: username,
        successMessage: `Successfully banned admin user "${username}"`,
      })
      setMasterPasswordDialog(true)
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // If current user is master admin, pass the master password directly
      const result = await banUser(username, isAdmin && isMasterAdmin ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD : null)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully banned user "${username}"`)
        await fetchUsers()
      }
    } catch (error) {
      setError("Failed to ban user")
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleUnbanUser function to check if the user is an admin
  const handleUnbanUser = async (username, isAdmin) => {
    // If the user is an admin and current user is not master admin, require master password
    if (isAdmin && !isMasterAdmin) {
      setPendingAction({
        action: unbanUser,
        params: username,
        successMessage: `Successfully unbanned admin user "${username}"`,
      })
      setMasterPasswordDialog(true)
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // If current user is master admin, pass the master password directly
      const result = await unbanUser(username, isAdmin && isMasterAdmin ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD : null)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully unbanned user "${username}"`)
        await fetchUsers()
      }
    } catch (error) {
      setError("Failed to unban user")
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleMasterPasswordSubmit function to handle ban/unban actions
  const handleMasterPasswordSubmit = async () => {
    if (!pendingAction) return

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // For ban/unban actions, pass the master password as second parameter
      const result =
        pendingAction.action.name === "banUser" || pendingAction.action.name === "unbanUser"
          ? await pendingAction.action(pendingAction.params, masterPassword)
          : await pendingAction.action(pendingAction.params, masterPassword)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(pendingAction.successMessage)
        await fetchUsers()
      }
    } catch (error) {
      setError("Action failed")
    } finally {
      setIsLoading(false)
      setMasterPasswordDialog(false)
      setMasterPassword("")
      setPendingAction(null)
    }
  }

  const requireMasterPassword = (action, params, successMessage) => {
    if (isMasterAdmin) {
      // If already master admin, execute directly
      action(params, process.env.NEXT_PUBLIC_ADMIN_PASSWORD).then((result) => {
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(successMessage)
          fetchUsers()
        }
      })
    } else {
      // Require master password
      setPendingAction({ action, params, successMessage })
      setMasterPasswordDialog(true)
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

  const handleExecuteSQL = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    setSqlResults(null)

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
        setSqlResults(result.results)
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

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAuthenticatedUser(null)
    setIsMasterAdmin(false)
    sessionStorage.removeItem("adminAuth")
    sessionStorage.removeItem("adminUser")
    sessionStorage.removeItem("masterAdmin")
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
                    <Label htmlFor="password">Master Admin Password</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="user" />
                    <Label htmlFor="user">Admin User Account</Label>
                  </div>
                </RadioGroup>
              </div>

              {authMethod === "password" ? (
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Master Admin Password</Label>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {authenticatedUser && <span>Logged in as: {authenticatedUser.name}</span>}
            {isMasterAdmin && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                Master Admin
              </span>
            )}
          </div>
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
                      <TableHead>Status</TableHead>
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
                          <div className="flex flex-col gap-1">
                            {user.isAdmin && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            )}
                            {user.isBanned ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {user.isAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  requireMasterPassword(
                                    removeAdminAccess,
                                    user.username,
                                    `Removed admin access from ${user.username}`,
                                  )
                                }
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
                            {user.isBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnbanUser(user.username, user.isAdmin)}
                                disabled={isLoading}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBanUser(user.username, user.isAdmin)}
                                disabled={isLoading}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Ban
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => requireMasterPassword(deleteUser, user.id, `Deleted user ${user.name}`)}
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

                {sqlResults && (
                  <div className="mt-4 space-y-4">
                    <h3 className="text-sm font-medium">Query Results:</h3>
                    {sqlResults.map((result, index) => (
                      <div key={index} className="border rounded-md">
                        <div className="bg-muted p-2 border-b">
                          <div className="text-xs font-mono">{result.query}</div>
                          <div className="text-xs text-muted-foreground">
                            {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} affected
                          </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-64">
                          {Array.isArray(result.result) && result.result.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(result.result[0]).map((key) => (
                                    <TableHead key={key} className="text-xs">
                                      {key}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {result.result.slice(0, 50).map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {Object.values(row).map((value, cellIndex) => (
                                      <TableCell key={cellIndex} className="text-xs">
                                        {value !== null ? String(value) : "NULL"}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <pre className="text-xs">{JSON.stringify(result.result, null, 2)}</pre>
                          )}
                        </div>
                      </div>
                    ))}
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

      {/* Master Password Dialog */}
      <Dialog open={masterPasswordDialog} onOpenChange={setMasterPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Master Admin Password Required</DialogTitle>
            <DialogDescription>This action requires the master admin password to proceed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Admin Password</Label>
              <Input
                id="masterPassword"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter master admin password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMasterPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMasterPasswordSubmit} disabled={!masterPassword || isLoading}>
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

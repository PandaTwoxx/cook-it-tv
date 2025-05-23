import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth-service"
import { ChatNotification } from "@/components/chat-notification"
import { ThemeToggle } from "@/components/theme-toggle"
import { Settings } from "lucide-react"

export async function Navbar() {
  const user = await getCurrentUser()

  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary">
          Cook'it
        </Link>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <>
              <ChatNotification />
              <Link href="/settings" className="text-muted-foreground hover:text-foreground">
                <Settings className="h-5 w-5" />
              </Link>
              <span className="text-sm text-muted-foreground">Hello, {user.name}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logout">Logout</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

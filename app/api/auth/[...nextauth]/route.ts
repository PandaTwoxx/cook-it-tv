import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"

// Create a simple SQL client
const sql = neon(process.env.DATABASE_URL!)

// Create a basic NextAuth configuration
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Basic validation
          if (!credentials?.username || !credentials?.password) {
            return null
          }

          // Query the database
          const users = await sql`
            SELECT * FROM "User" WHERE username = ${credentials.username} LIMIT 1
          `

          // Check if user exists
          if (users.length === 0) {
            return null
          }

          const user = users[0]

          // Check if user is banned
          if (user.isBanned) {
            throw new Error("Your account has been banned. Please contact support.")
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            return null
          }

          // Return user data
          return {
            id: user.id,
            name: user.name,
            username: user.username,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }

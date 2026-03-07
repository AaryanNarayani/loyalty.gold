import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import jwt from "jsonwebtoken";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-super-secret-key",
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        // Sign our own token
        const secret = process.env.NEXTAUTH_SECRET || "development-super-secret-key";
        token.accessToken = jwt.sign(
          { sub: user.id, email: user.email },
          secret,
          { expiresIn: "30d" }
        );
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub; // Inject user ID into session
        // Expose our signed token to the client
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

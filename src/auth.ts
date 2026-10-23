import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/server/accounts";
import { prisma } from "@/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const user = await verifyCredentials(prisma, String(c?.email ?? ""), String(c?.password ?? ""));
        return user ? { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, sessionVersion: user.sessionVersion } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sv = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.sv = typeof token.sv === "number" ? token.sv : undefined;
      return session;
    },
  },
});

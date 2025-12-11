import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import type { JWT } from "next-auth/jwt"
import type { Account, Session, AuthOptions } from "next-auth"

interface SpotifyAccount extends Account {
    expires_in: number
}

const SPOTIFY_SCOPES = [
    "user-read-email",
    "playlist-read-private",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-top-read",
].join(" ")



export const authOptions: AuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
            authorization: `https://accounts.spotify.com/authorize?scope=${SPOTIFY_SCOPES}`,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, account }: { token: JWT; account?: Account | null }) {
            // Type guard for SpotifyAccount
            const spotifyAccount = account as SpotifyAccount | null | undefined;

            if (spotifyAccount) {
                token.accessToken = spotifyAccount.access_token;
                token.refreshToken = spotifyAccount.refresh_token;
                token.expiresAt = Date.now() + spotifyAccount.expires_in * 1000;
            }

            // Refresh token if expired
            if (token.expiresAt && Date.now() > (token.expiresAt as number)) {
                try {
                    const res = await fetch("https://accounts.spotify.com/api/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            Authorization: `Basic ${Buffer.from(
                                process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
                            ).toString("base64")}`,
                        },
                        body: new URLSearchParams({
                            grant_type: "refresh_token",
                            refresh_token: token.refreshToken as string,
                        }),
                    });
                    const refreshed = await res.json();
                    token.accessToken = refreshed.access_token;
                    token.expiresAt = Date.now() + refreshed.expires_in * 1000;
                } catch (e) {
                    console.error("Error refreshing token", e);
                    return null;
                }
            }

            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                (session.user as typeof session.user & { accessToken?: string }).accessToken = token.accessToken as string | undefined
            }
            return session
        },
    },
}


const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

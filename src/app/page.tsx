"use client"

import { signIn, useSession, signOut } from "next-auth/react"
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h5>Welcome to Spotify Swiss!</h5>
        <div className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
            <p>Login and authenticate with your Spotify account</p>
        </div>


          {!session ? (
              <button
                  onClick={() => signIn("spotify")}
                  className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              >
                  Login with Spotify
              </button>
          ) : (
              /* If user is logged in → show logout + welcome */
              <div className="flex flex-col gap-4 items-center sm:items-start">
                  <p>Welcome, {session.user?.name}</p>
                  <div className="flex flex-row gap-[32px] items-center sm:items-start">
                  <Link href="/workouts">
                      <button
                          className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                      >
                          Enter Spotify Swiss
                      </button>
                  </Link>
                  <button
                      onClick={() => signOut()}
                      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-500 text-white hover:bg-red-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                  >
                      Logout
                  </button>
                  </div>
              </div>
          )}
      </main>
    </div>
  );
}

'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in by looking for the access_token in localStorage (or cookie/middleware state if you prefer)
    if (typeof window !== 'undefined' && localStorage.getItem("access_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>ADK System Admin</h1>
      {/* <p>Go to /login to sign in.</p> */}
    </main>
  );
}

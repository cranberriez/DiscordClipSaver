"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            signOut({ callbackUrl: "/login" });
        } else if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    return null; // Render nothing while redirecting
}

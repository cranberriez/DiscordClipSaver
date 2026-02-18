"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignIn() {
    return (
        <Button
            onClick={() => signIn("discord", { callbackUrl: "/clips" })}
            size="lg"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg h-12 text-base"
        >
            Sign In with Discord
        </Button>
    );
}

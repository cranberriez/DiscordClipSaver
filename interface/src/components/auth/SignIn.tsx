"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignIn() {
    return (
        <Button onClick={() => signIn("discord")} size="lg" className="w-full">
            Sign In with Discord
        </Button>
    );
}

"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignIn() {
	return (
		<Button
			onClick={() => signIn("discord", { callbackUrl: "/clips" })}
			size="lg"
			className="h-12 w-full bg-[#5865F2] text-base font-medium text-white shadow-md transition-all duration-200 hover:bg-[#4752C4] hover:shadow-lg"
		>
			Sign In with Discord
		</Button>
	);
}

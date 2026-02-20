"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOut() {
	return (
		<Button
			onClick={() => signOut({ callbackUrl: "/login" })}
			variant="destructive"
		>
			Sign Out
		</Button>
	);
}

"use client";

import { signOut } from "next-auth/react";

export default function SignOut() {
	return (
		<button
			onClick={() => signOut()}
			className="bg-red-200 hover:bg-red-400 text-black font-bold py-1 px-2 rounded"
		>
			Sign Out
		</button>
	);
}

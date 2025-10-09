"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const STATUS_MESSAGES = {
	ok: "Success",
	denied: "Denied",
	expired: "Expired",
	invalid: "Invalid",
};

function InstallContent() {
	const searchParams = useSearchParams();
	const guild = searchParams.get("guild");
	const status = searchParams.get("status");

	return (
		<div>
			Bot Installed to Guild {guild} with status{" "}
			{STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES] ?? status}
		</div>
	);
}

export default function InstallPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<InstallContent />
		</Suspense>
	);
}

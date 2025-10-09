"use client";
import { useSearchParams } from "next/navigation";

const STATUS_MESSAGES = {
	ok: "Success",
	denied: "Denied",
	expired: "Expired",
	invalid: "Invalid",
};

export default function InstallPage() {
	const searchParams = useSearchParams();
	const guild = searchParams.get("guild");
	const status = searchParams.get("status");

	return (
		<div>
			Bot Installed to Guild {guild} with status {status}
		</div>
	);
}

// interface/src/app/dashboard/GuildList.tsx
import { cookies } from "next/headers";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function GuildList() {
	const res = await fetch(`${baseUrl}/api/discord/guilds`, {
		headers: { Cookie: (await cookies()).toString() },
		cache: "no-store",
	});

	if (!res.ok) {
		const message = res.status === 401 ? "You must sign in to view guilds." : "Failed to load guilds.";
		return <p className="text-sm text-red-500">{message}</p>;
	}

	const guilds = (await res.json()) as { id: string; name: string }[];
	if (guilds.length === 0) {
		return <p className="text-sm text-muted-foreground">No guilds found.</p>;
	}

	return (
		<ul className="space-y-2">
			{guilds.map(({ id, name }) => (
				<li
					key={id}
					className="rounded border border-border p-3"
				>
					<p className="font-medium">{name}</p>
					<p className="text-xs text-muted-foreground">ID: {id}</p>
				</li>
			))}
		</ul>
	);
}

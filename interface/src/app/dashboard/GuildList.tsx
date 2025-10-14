// interface/src/app/dashboard/GuildList.tsx
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { canInviteBot } from "@/lib/discord/visibility";
import type { FullGuild, GuildRelation } from "@/lib/discord/types";
import { GuildItemComponent } from "./GuildItemComponent";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function GuildList() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <p className="text-sm text-red-500">You must sign in to view guilds.</p>;
  }
  const currentUserId = String(session.user.id);

  const res = await fetch(`${baseUrl}/api/discord/user/guilds?includeDb=1`, {
    headers: { Cookie: (await cookies()).toString() },
    cache: "no-store",
  });

  if (!res.ok) {
    const message = res.status === 401 ? "You must sign in to view guilds." : "Failed to load guilds.";
    return <p className="text-sm text-red-500">{message}</p>;
  }

  const data = await res.json();
  const discordGuilds = Array.isArray(data) ? data : data.guilds;
  const dbGuilds = Array.isArray(data) ? [] : (data.dbGuilds ?? []);

  if (!discordGuilds) return <p className="text-sm text-red-500">Failed to load guilds.</p>;

  // Build FullGuild[] by joining Discord partial guilds with optional DB rows
  const dbById = new Map((dbGuilds as any[]).map((row: any) => [row.id, row]));
  const discordList: any[] = Array.isArray(discordGuilds) ? (discordGuilds as any[]).filter(Boolean) : [];
  const items: FullGuild[] = discordList.map((dg: any) => ({
    discord: dg,
    db: dg?.id ? dbById.get(dg.id) : undefined,
  }));

  // Categorize
  const installed: FullGuild[] = items.filter((i) => i.db);
  const installedNoOwner: FullGuild[] = installed.filter((i) => i.db?.owner == null);
  const installedOwnedByYou: FullGuild[] = installed.filter((i) => i.db?.owner === currentUserId);
  const installedOthers: FullGuild[] = installed.filter(
    (i) => i.db?.owner != null && i.db.owner !== currentUserId
  );
  const invitable: FullGuild[] = items.filter((i) => !i.db && canInviteBot(i.discord));
  const notInstalled: FullGuild[] = items.filter((i) => !i.db && !canInviteBot(i.discord));

  return (
    <div className="space-y-6">
      <Section
        title="Installed (owned by you)"
        relation="owned"
        items={installedOwnedByYou}
      />
      <Section
        title="Installed (no owner yet)"
        relation="unowned"
        items={installedNoOwner}
      />
      <Section
        title="Invitable (you can add the bot)"
        relation="invitable"
        items={invitable}
      />
      <Section
        title="Installed (owned by others)"
        relation="other"
        items={installedOthers}
      />
      <Section
        title="Not installed"
        relation="other"
        items={notInstalled}
      />
    </div>
  );
}

function Section({ title, items, relation }: { title: string; items: FullGuild[]; relation: GuildRelation }) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-fit">
        {items.map((guild) => (
          <GuildItemComponent
            guild={guild}
            relation={relation}
            key={guild.discord.id}
          />
        ))}
      </ul>
    </div>
  );
}

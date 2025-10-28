import { getSingleGuildById } from "@/server/db";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Button } from "@/components/ui/button";
import { MoveLeft } from "lucide-react";
import { SetupMain } from "@/features/setup/components";
import Link from "next/link";

type PageProps = {
    params: Promise<{ guildId: string }>;
};

export default async function SetupPage({ params }: PageProps) {
    const { guildId } = await params;

    // Ensure user has owner access to this guild
    const session = await getServerSession(authOptions);

    if (!session) {
        return redirect("/login");
    }

    const guild = await getSingleGuildById(guildId);
    if (!guild) {
        return (
            <ErrorBox message="Guild does not exist, please re-add the bot and try again." />
        );
    }

    if (guild.owner_id !== session.user?.id) {
        return (
            <ErrorBox message="You do not have permission to access this guild." />
        );
    }

    return <SetupMain guild={guild} />;
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-xl font-semibold text-red-400">{message}</p>
            <Button asChild variant="outline">
                <Link href="/dashboard">
                    <MoveLeft />
                    Back to Dashboard
                </Link>
            </Button>
        </div>
    );
}

import { GuildList } from "@/features/dashboard/list";
import { PageContainer } from "@/components/layout";
import { InstallBot } from "@/features/dashboard/list";

export default async function DashboardPage() {
    return (
        <PageContainer>
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold mb-2">Install Bot</h1>
                <p className="text-gray-400">
                    Install the bot to your server to enable clip scanning
                </p>
                <InstallBot />
            </div>

            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold mb-2">Your Servers</h1>
                <p className="text-gray-400">
                    Select a server to manage clip scanning and settings
                </p>
                <GuildList />
            </div>
        </PageContainer>
    );
}

import GuildList from "@/features/dashboard/components/GuildList";
import { PageContainer } from "@/components/layout";

export default async function DashboardPage() {
    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Your Servers</h1>
                <p className="text-gray-400">
                    Select a server to manage clip scanning and settings
                </p>
            </div>

            <GuildList />
        </PageContainer>
    );
}

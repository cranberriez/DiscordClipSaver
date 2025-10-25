import { GuildList } from "@/features/dashboard/list";
import { PageContainer } from "@/components/layout";
import { InstallBot } from "@/features/dashboard/list";

export default async function DashboardPage() {
    return (
        <PageContainer className="space-y-8">
            <InstallBot />
            <GuildList />
        </PageContainer>
    );
}

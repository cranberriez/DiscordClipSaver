import GuildList from "@/components/dashboard/GuildList";

export default async function DashboardPage() {
    return (
        <div className="container mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Your Servers</h1>
                <p className="text-gray-400">
                    Select a server to manage clip scanning and settings
                </p>
            </div>

            <GuildList />
        </div>
    );
}

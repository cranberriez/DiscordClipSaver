import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            {/* Simple Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">Discord Clip Saver</h1>
                    <Button asChild>
                        <Link href={session ? "/dashboard" : "/login"}>
                            {session ? "Dashboard" : "Sign In"}
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-4 py-20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-5xl font-bold mb-6">
                        Save Your Discord Clips
                    </h2>
                    <p className="text-xl text-gray-400 mb-8">
                        Automatically scan and save video clips from your
                        Discord servers. Never lose a great moment again.
                    </p>
                    <Button asChild size="lg">
                        <Link href={session ? "/clips" : "/login"}>
                            {session ? "Go to Clips" : "Get Started"}
                        </Link>
                    </Button>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold mb-2">
                            Automatic Scanning
                        </h3>
                        <p className="text-gray-400">
                            Automatically detect and save video clips posted in
                            your Discord channels.
                        </p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold mb-2">
                            Channel Control
                        </h3>
                        <p className="text-gray-400">
                            Choose which channels to scan and manage settings
                            per server.
                        </p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold mb-2">
                            Easy Management
                        </h3>
                        <p className="text-gray-400">
                            Simple dashboard to view scan status and configure
                            your preferences.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

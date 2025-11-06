import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { UserInfo } from "@/components/user/UserInfo";
import { PageContainer } from "@/components/layout/PageContainer";
import { RootLayout } from "@/components/layout";

async function fetchUserData() {
    // Use the API route we created which handles authentication properly
    const cookieStore = await cookies();
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/discord/me`, {
        headers: {
            // Forward cookies for authentication
            cookie: cookieStore.toString(),
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch user data");
    }

    return response.json();
}

export default async function UserSettingsPage() {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Fetch user data via our API route (which has proper JWT access)
    let userData = null;
    let error = null;

    try {
        userData = await fetchUserData();
    } catch (err) {
        console.error("Failed to fetch user data:", err);
        error = err;
    }

    return (
        <RootLayout>
            <PageContainer className="flex-1">
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold">User Settings</h1>
                        <p className="text-muted-foreground mt-2">
                            View your account information and authentication
                            details
                        </p>
                    </div>

                    {userData ? (
                        <UserInfo
                            discordUser={userData.discord}
                            dbUser={userData.database}
                        />
                    ) : (
                        <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-lg">
                            <h3 className="font-semibold text-destructive mb-2">
                                Failed to Load User Data
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Unable to fetch your Discord user information.
                                This may be due to an expired token or Discord
                                API issues. Try signing out and back in.
                            </p>
                        </div>
                    )}
                </div>
            </PageContainer>
        </RootLayout>
    );
}

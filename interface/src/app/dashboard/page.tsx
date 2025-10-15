import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import GuildList from "./GuildList";
import SignOut from "../_components/SignOut";
import SignIn from "../_components/SignIn";

export default async function Dashboard() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return (
            <div className="p-8">
                <p>You need to sign in to view the dashboard.</p>
                <SignIn />
            </div>
        );
    }

    const { user } = session;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
            <ul className="space-y-2">
                <li>
                    <strong>Name:</strong> {user?.name ?? "Unknown"}
                </li>
                <li>
                    <strong>Email:</strong> {user?.email ?? "Not provided"}
                </li>
                <li>
                    <strong>Discord ID:</strong>{" "}
                    {(user as typeof user & { id?: string })?.id ??
                        "Not available"}
                </li>
                <pre className="whitespace-pre-wrap bg-white/5 m-2 p-2 rounded inline-block">
                    {JSON.stringify(user, null, 4).replace(/\n/g, "\n\n")}
                </pre>
            </ul>
            <SignOut />
            <section className="mt-8">
                <h2 className="text-xl font-semibold mb-3">Guilds</h2>
                <GuildList />
            </section>
        </div>
    );
}

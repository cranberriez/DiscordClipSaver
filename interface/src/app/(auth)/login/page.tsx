import SignIn from "@/components/composite/SignIn";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function LoginPage(props: {
    searchParams: Promise<{ error?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const searchParams = await props.searchParams;
    const error = searchParams.error;

    let errorMessage = "";
    if (error === "Callback") {
        errorMessage = "Sign in was canceled or failed. Please try again.";
    } else if (error === "AccessDenied") {
        errorMessage = "Access denied. You do not have permission to sign in.";
    } else if (error) {
        errorMessage = "An error occurred during sign in.";
    }

    return (
        <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-8">
                <div className="mx-auto bg-[#5865F2]/10 p-4 rounded-full w-fit mb-2 animate-in fade-in zoom-in duration-500">
                    <Image
                        src="/discord-icon.svg"
                        alt="Discord Logo"
                        width={64}
                        height={64}
                        className="w-16 h-16"
                        priority
                    />
                </div>
                <div className="space-y-2">
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        {session ? "Welcome Back" : "Discord Clip Saver"}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {session
                            ? `Signed in as ${session.user?.name}`
                            : "Sign in with Discord to manage your clip scanning"}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="pb-8 px-8">
                {errorMessage && (
                    <div className="mb-6 p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                        {errorMessage}
                    </div>
                )}
                {session ? (
                    <Button asChild size="lg" className="w-full h-12 text-base">
                        <Link href="/clips">Continue to Clips</Link>
                    </Button>
                ) : (
                    <SignIn />
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground pb-8">
                {!session && (
                    <p>
                        By signing in, you agree to our usage of cookies for
                        authentication purposes.
                    </p>
                )}
                {session && (
                    <p className="text-xs">
                        Not you?{" "}
                        <a
                            href="/logout"
                            className="underline hover:text-foreground"
                        >
                            Sign out
                        </a>
                    </p>
                )}
            </CardFooter>
        </Card>
    );
}

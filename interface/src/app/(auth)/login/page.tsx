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
		<Card className="bg-card/95 w-full max-w-md border-0 shadow-2xl backdrop-blur-sm">
			<CardHeader className="space-y-4 pb-8 text-center">
				<div className="animate-in fade-in zoom-in mx-auto mb-2 w-fit rounded-full bg-[#5865F2]/10 p-4 duration-500">
					<Image
						src="/discord-icon.svg"
						alt="Discord Logo"
						width={64}
						height={64}
						className="h-16 w-16"
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
			<CardContent className="px-8 pb-8">
				{errorMessage && (
					<div className="bg-destructive/15 text-destructive animate-in fade-in slide-in-from-top-2 mb-6 rounded-md p-3 text-center text-sm font-medium">
						{errorMessage}
					</div>
				)}
				{session ? (
					<Button asChild size="lg" className="h-12 w-full text-base">
						<Link href="/clips">Continue to Clips</Link>
					</Button>
				) : (
					<SignIn />
				)}
			</CardContent>
			<CardFooter className="text-muted-foreground flex flex-col gap-4 pb-8 text-center text-sm">
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
							className="hover:text-foreground underline"
						>
							Sign out
						</a>
					</p>
				)}
			</CardFooter>
		</Card>
	);
}

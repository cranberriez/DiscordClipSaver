"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

function ErrorContent() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	let errorMessage = "An unknown error occurred.";
	let errorDescription = "Please try signing in again.";

	switch (error) {
		case "Configuration":
			errorMessage = "Server Configuration Error";
			errorDescription =
				"There is a problem with the server configuration. Check if the Discord Client ID and Secret are correct.";
			break;
		case "AccessDenied":
			errorMessage = "Access Denied";
			errorDescription = "You do not have permission to sign in.";
			break;
		case "Verification":
			errorMessage = "Verification Failed";
			errorDescription =
				"The verification link was invalid or has expired.";
			break;
		case "OAuthSignin":
		case "OAuthCallback":
			errorMessage = "Login Failed";
			errorDescription =
				"Could not authenticate with Discord. Please try again.";
			break;
		case "OAuthCreateAccount":
			errorMessage = "Account Creation Failed";
			errorDescription =
				"Could not create a user account in the database.";
			break;
		case "EmailSignin":
			errorMessage = "Email Signin Failed";
			errorDescription = "Sending the verification email failed.";
			break;
		case "Callback":
			errorMessage = "Callback Error";
			errorDescription =
				"An error occurred during the authentication callback.";
			break;
		case "OAuthAccountNotLinked":
			errorMessage = "Account Not Linked";
			errorDescription =
				"The email on your Discord account is already associated with another account.";
			break;
		case "SessionRequired":
			errorMessage = "Session Required";
			errorDescription = "You must be signed in to access this page.";
			break;
		default:
			if (error) {
				errorMessage = error;
			}
			break;
	}

	return (
		<Card className="bg-card/95 w-full max-w-md border-0 shadow-2xl backdrop-blur-sm">
			<CardHeader className="space-y-4 pb-8 text-center">
				<div className="bg-destructive/10 animate-in fade-in zoom-in mx-auto mb-2 w-fit rounded-full p-4 duration-500">
					<AlertCircle className="text-destructive h-16 w-16" />
				</div>
				<div className="space-y-2">
					<CardTitle className="text-destructive text-2xl font-bold tracking-tight">
						{errorMessage}
					</CardTitle>
					<CardDescription className="text-base">
						{errorDescription}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="px-8 pb-8">
				<div className="text-muted-foreground bg-muted/50 rounded-lg p-4 text-center text-sm">
					If this error persists, please contact an administrator.
				</div>
			</CardContent>
			<CardFooter className="flex justify-center pb-8">
				<Button asChild size="lg" className="h-12 w-full text-base">
					<Link href="/login">Back to Login</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

export default function AuthErrorPage() {
	return (
		<Suspense
			fallback={
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Loading...</CardTitle>
					</CardHeader>
				</Card>
			}
		>
			<ErrorContent />
		</Suspense>
	);
}

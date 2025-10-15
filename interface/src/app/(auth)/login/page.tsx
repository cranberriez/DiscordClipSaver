import SignIn from "@/components/auth/SignIn";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Discord Clip Saver</CardTitle>
                <CardDescription>
                    Sign in with Discord to manage your clip scanning
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SignIn />
            </CardContent>
        </Card>
    );
}

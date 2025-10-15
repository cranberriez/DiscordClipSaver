import SignIn from "@/components/auth/SignIn";

export default function LoginPage() {
    return (
        <div className="w-full max-w-md">
            <div className="bg-gray-900 border border-white/10 rounded-lg p-8 shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Discord Clip Saver
                    </h1>
                    <p className="text-gray-400">
                        Sign in with Discord to manage your clip scanning
                    </p>
                </div>

                <SignIn />
            </div>
        </div>
    );
}

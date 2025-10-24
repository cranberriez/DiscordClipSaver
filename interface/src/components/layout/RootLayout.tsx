import { Navbar } from "@/components/composite/navbar";

export function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex flex-1">{children}</main>
        </div>
    );
}

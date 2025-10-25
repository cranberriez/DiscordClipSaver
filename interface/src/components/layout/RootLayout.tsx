import { Navbar } from "@/components/composite/navbar";

export function RootLayout({
    children,
    noLines,
}: {
    children: React.ReactNode;
    noLines?: boolean;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar noLines={noLines} />
            <main className="flex flex-1">{children}</main>
        </div>
    );
}

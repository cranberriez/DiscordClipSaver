import { PageContainer } from "@/components/layout";
import { HomeIcon, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { FilterNavButton } from "./FilterButton";
import { UserMenu } from "@/components/composite/UserMenu";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import type { User } from "next-auth";

export function ClipNavbar({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    return (
        <div className="flex items-center z-10 w-full border-b h-16 min-h-16">
            <PageContainer
                className="p-0! flex h-full items-center gap-2"
                noLines
            >
                <FilterNavButton>
                    <Link href="/">
                        <HomeIcon className="h-5 w-5" />
                    </Link>
                </FilterNavButton>

                {children}

                <FilterNavButton className="ml-auto">
                    <Link href="/dashboard">
                        <LayoutDashboard className="h-5 w-5" />
                    </Link>
                </FilterNavButton>

                {/* User Menu */}
                {session ? (
                    <UserMenu user={session.user as User} />
                ) : (
                    <Button asChild>
                        <Link href="/login">Sign In</Link>
                    </Button>
                )}
            </PageContainer>
        </div>
    );
}

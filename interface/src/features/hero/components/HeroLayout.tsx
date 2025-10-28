import { ReactNode } from "react";

interface HeroLayoutProps {
    children: ReactNode;
}

export function HeroLayout({ children }: HeroLayoutProps) {
    return (
        <section
            className="flex items-center justify-center px-6"
            style={{ height: "calc(100vh - var(--navbar-height))" }}
        >
            <div className="container mx-auto max-w-5xl">{children}</div>
        </section>
    );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { RootLayout } from "@/components/layout/RootLayout";

type ClipsLayoutProps = {
    children: React.ReactNode;
};

export default function ClipsLayout({ children }: ClipsLayoutProps) {
    return (
        <div className="h-screen w-screen overflow-hidden relative">
            {children}
        </div>
    );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { RootLayout } from "@/components/layout/RootLayout";

type ClipsLayoutProps = {
    children: React.ReactNode;
};

export default function ClipsLayout({ children }: ClipsLayoutProps) {
    return (
        <RootLayout>
            <PageContainer>{children}</PageContainer>
        </RootLayout>
    );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { RootLayout } from "@/components/layout/RootLayout";

type ClipsLayoutProps = {
    children: React.ReactNode;
};

export default function ClipsLayout({ children }: ClipsLayoutProps) {
    return (
        <RootLayout noLines>
            <PageContainer noLines maxWidth="full">
                {children}
            </PageContainer>
        </RootLayout>
    );
}

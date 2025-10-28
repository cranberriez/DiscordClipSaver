import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { 
    HeroSection, 
    FeatureGrid, 
    PricingSection, 
    OpenSourceBanner, 
    CallToAction,
    HeroLayout,
    SectionLayout
} from "@/features/hero/components";
import { PageContainer, RootLayout } from "@/components/layout";

export default async function HomePage() {
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session;

    return (
        <RootLayout noLines>
            <PageContainer noLines>
                <div className="flex flex-col">
                    <HeroLayout>
                        <HeroSection isAuthenticated={isAuthenticated} />
                    </HeroLayout>
                    <SectionLayout>
                        <FeatureGrid />
                    </SectionLayout>
                    <SectionLayout>
                        <PricingSection />
                    </SectionLayout>
                    <SectionLayout>
                        <OpenSourceBanner />
                    </SectionLayout>
                    <SectionLayout>
                        <CallToAction isAuthenticated={isAuthenticated} />
                    </SectionLayout>
                </div>
            </PageContainer>
        </RootLayout>
    );
}

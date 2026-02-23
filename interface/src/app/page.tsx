import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import {
	FeatureGrid,
	PricingSection,
	OpenSourceBanner,
	CallToAction,
	DataPrivacySection,
	SectionLayout,
	Hero,
} from "@/features/hero/components";
import { PageContainer, RootLayout } from "@/components/layout";
import { Navbar } from "@/components/composite/navbar";

export default async function HomePage() {
	const session = await getServerSession(authOptions);
	const isAuthenticated = !!session;

	return (
		<RootLayout hideNavbar={true}>
			{/* <HeroLayout>
				<HeroSection isAuthenticated={isAuthenticated} />
			</HeroLayout> */}
			<Navbar
				containerClassName="mt-2 py-0!"
				className="bg-sidebar/50 border-border/25 rounded-full backdrop-blur-sm"
			/>
			<Hero isAuthenticated={isAuthenticated} />
			<PageContainer>
				<div className="flex flex-col">
					<SectionLayout>
						<FeatureGrid />
					</SectionLayout>
					<SectionLayout>
						<PricingSection />
					</SectionLayout>
					<SectionLayout>
						<DataPrivacySection />
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

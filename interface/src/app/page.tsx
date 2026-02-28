import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { Metadata } from "next";
import {
	FeatureGrid,
	FaqSection,
	PricingSection,
	OpenSourceBanner,
	FinalCallToAction,
	DataPrivacySection,
	Hero,
	TopHeader,
} from "@/features/hero/components";
import { PageContainer, RootLayout } from "@/components/layout";
import { HeroNavScrollContainer } from "@/components/core/HeroNavScrollContainer";

export const metadata: Metadata = {
	title: "Guild Moments | Discord Clip Saver & Organizer",
	description:
		"Automatically save, organize, and search through your Discord community's best video clips and attachments.",
	keywords: ["discord", "clips", "video", "bot", "gaming", "community"],
};

export default async function HomePage() {
	const session = await getServerSession(authOptions);
	const isAuthenticated = !!session;

	return (
		<RootLayout hideNavbar={true}>
			{/* <HeroLayout>
				<HeroSection isAuthenticated={isAuthenticated} />
			</HeroLayout> */}
			<HeroNavScrollContainer />
			<Hero isAuthenticated={isAuthenticated} />
			<PageContainer>
				<div className="flex flex-col">
					<TopHeader />
					<FeatureGrid />
					<FaqSection />
					<PricingSection />
					<DataPrivacySection />
					<OpenSourceBanner />
					<FinalCallToAction isAuthenticated={isAuthenticated} />
				</div>
			</PageContainer>
		</RootLayout>
	);
}

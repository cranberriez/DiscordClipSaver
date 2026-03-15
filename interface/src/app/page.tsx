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
	title: "Discord Clip Saver & Video Organizer | Guild Moments",
	description:
		"The best Discord clip saver to automatically archive, organize, and search your community's gaming moments, video clips, and attachments. Never lose a great moment again.",
	keywords: [
		"discord clip saver",
		"save discord clips",
		"discord moments",
		"gaming clips",
		"video organizer",
		"community moments",
		"discord bot clips",
		"guild moments",
	],
	openGraph: {
		title: "Discord Clip Saver & Video Organizer | Guild Moments",
		description:
			"The best Discord clip saver to automatically archive, organize, and search your community's gaming moments, video clips, and attachments.",
	},
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

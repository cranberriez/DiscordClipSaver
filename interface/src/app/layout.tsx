import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Guild Moments | The Ultimate Clip Saver for Communities",
		template: "%s | Guild Moments",
	},
	description:
		"Automatically save, organize, and search through your community's best gaming moments and video clips. The perfect clip saver for Discord servers and gaming guilds.",
	keywords: [
		"clip saver",
		"discord clip saver",
		"gaming clips",
		"community moments",
		"discord moments",
		"video organizer",
		"save gaming clips",
		"guild moments",
		"discord moments",
	],
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Guild Moments",
		title: "Guild Moments | The Ultimate Clip Saver for Communities",
		description:
			"Automatically save, organize, and search through your community's best gaming moments and video clips. The perfect clip saver for Discord servers and gaming guilds.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Guild Moments | The Ultimate Clip Saver for Communities",
		description:
			"Automatically save, organize, and search through your community's best gaming moments and video clips.",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}

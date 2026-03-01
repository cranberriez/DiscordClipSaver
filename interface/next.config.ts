import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	experimental: {
		serverActions: {
			bodySizeLimit: "1mb",
		},
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
			},
		],
	},
};

export default nextConfig;

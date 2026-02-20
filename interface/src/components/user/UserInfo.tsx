import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	global_name?: string | null;
	avatar?: string | null;
	banner?: string | null;
	accent_color?: number | null;
	avatar_decoration?: string | null;
	avatar_decoration_data?: {
		asset: string;
		sku_id: string;
	} | null;
	email?: string;
	verified?: boolean;
	mfa_enabled?: boolean;
	locale?: string;
	flags?: number;
	premium_type?: number;
	public_flags?: number;
	bot?: boolean;
	system?: boolean;
	collectibles?: {
		avatar_decoration?: any;
		profile_effect?: any;
	};
}

interface DbUser {
	id: string;
	username: string;
	discriminator: string;
	avatar_url: string | null;
	roles: string | null;
	created_at: string;
	updated_at: string;
}

interface UserInfoProps {
	discordUser: DiscordUser;
	dbUser: DbUser | null;
}

export function UserInfo({ discordUser, dbUser }: UserInfoProps) {
	const avatarUrl = discordUser.avatar
		? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
		: undefined;

	const bannerUrl = discordUser.banner
		? `https://cdn.discordapp.com/banners/${discordUser.id}/${discordUser.banner}.png?size=600`
		: undefined;

	const avatarDecorationUrl = discordUser.avatar_decoration
		? `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration}.png`
		: undefined;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const getDisplayName = () => {
		if (discordUser.global_name) return discordUser.global_name;
		if (discordUser.discriminator !== "0") {
			return `${discordUser.username}#${discordUser.discriminator}`;
		}
		return discordUser.username;
	};

	const getAccountType = () => {
		if (discordUser.bot) return "Bot";
		if (discordUser.system) return "System";
		return "User";
	};

	const formatDiscordFlags = (flags?: number) => {
		if (!flags) return [];

		const flagNames: Record<number, string> = {
			1: "Discord Employee",
			2: "Partnered Server Owner",
			4: "HypeSquad Events",
			8: "Bug Hunter Level 1",
			64: "House Bravery",
			128: "House Brilliance",
			256: "House Balance",
			512: "Early Supporter",
			16384: "Bug Hunter Level 2",
			131072: "Verified Bot Developer",
			4194304: "Active Developer",
		};

		return Object.entries(flagNames)
			.filter(([flag]) => (flags & parseInt(flag)) === parseInt(flag))
			.map(([, name]) => name);
	};

	const getPremiumType = (type?: number) => {
		switch (type) {
			case 1:
				return "Nitro Classic";
			case 2:
				return "Nitro";
			case 3:
				return "Nitro Basic";
			default:
				return "None";
		}
	};

	const userFlags = formatDiscordFlags(discordUser.public_flags);

	return (
		<div className="space-y-6">
			<Card className="py-0! pb-6!">
				{bannerUrl && (
					<div
						className="h-32 rounded-t-lg bg-cover bg-center"
						style={{ backgroundImage: `url(${bannerUrl})` }}
					/>
				)}
				<CardHeader className={bannerUrl ? "relative -mt-8" : ""}>
					<CardTitle className="flex items-center gap-3">
						<div className="relative">
							<Avatar className="border-background h-16 w-16 border-4">
								<AvatarImage
									src={avatarUrl}
									alt={getDisplayName()}
								/>
								<AvatarFallback>
									{getDisplayName().charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							{avatarDecorationUrl && (
								<img
									src={avatarDecorationUrl}
									alt="Avatar decoration"
									className="pointer-events-none absolute inset-0 h-16 w-16"
								/>
							)}
						</div>
						<div className="flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-xl font-semibold">
									{getDisplayName()}
								</span>
								<Badge variant="outline" className="text-xs">
									{getAccountType()}
								</Badge>
							</div>
							{discordUser.global_name && (
								<div className="text-muted-foreground text-sm">
									Username: {discordUser.username}
									{discordUser.discriminator !== "0" &&
										`#${discordUser.discriminator}`}
								</div>
							)}
							<div className="text-muted-foreground font-mono text-xs">
								ID: {discordUser.id}
							</div>
						</div>
					</CardTitle>
					<CardDescription>
						Discord account information
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<h4 className="mb-2 font-medium">Account Status</h4>
							<div className="space-y-2">
								{discordUser.verified !== undefined && (
									<div className="flex items-center gap-2">
										<span className="text-sm">
											Email Verified:
										</span>
										<Badge
											variant={
												discordUser.verified
													? "default"
													: "destructive"
											}
										>
											{discordUser.verified
												? "Yes"
												: "No"}
										</Badge>
									</div>
								)}
								{discordUser.mfa_enabled !== undefined && (
									<div className="flex items-center gap-2">
										<span className="text-sm">
											2FA Enabled:
										</span>
										<Badge
											variant={
												discordUser.mfa_enabled
													? "default"
													: "secondary"
											}
										>
											{discordUser.mfa_enabled
												? "Yes"
												: "No"}
										</Badge>
									</div>
								)}
								<div className="flex items-center gap-2">
									<span className="text-sm">Premium:</span>
									<Badge variant="outline">
										{getPremiumType(
											discordUser.premium_type
										)}
									</Badge>
								</div>
							</div>
						</div>

						<div>
							<h4 className="mb-2 font-medium">
								Additional Info
							</h4>
							<div className="space-y-2 text-sm">
								{discordUser.locale && (
									<div>
										<span className="font-medium">
											Locale:
										</span>{" "}
										{discordUser.locale}
									</div>
								)}
								{discordUser.accent_color && (
									<div className="flex items-center gap-2">
										<span className="font-medium">
											Accent Color:
										</span>
										<div
											className="h-4 w-4 rounded border"
											style={{
												backgroundColor: `#${discordUser.accent_color
													.toString(16)
													.padStart(6, "0")}`,
											}}
										/>
										<span className="text-muted-foreground">
											#
											{discordUser.accent_color
												.toString(16)
												.padStart(6, "0")}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{userFlags.length > 0 && (
						<div>
							<h4 className="mb-2 font-medium">Discord Badges</h4>
							<div className="flex flex-wrap gap-2">
								{userFlags.map((flag) => (
									<Badge key={flag} variant="secondary">
										{flag}
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{dbUser && (
				<Card>
					<CardHeader>
						<CardTitle>Database Record</CardTitle>
						<CardDescription>
							Local database information for this user
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
							<div>
								<span className="font-medium">Username:</span>{" "}
								{dbUser.username}
							</div>
							<div>
								<span className="font-medium">
									Discriminator:
								</span>{" "}
								{dbUser.discriminator}
							</div>
							<div>
								<span className="font-medium">First Seen:</span>{" "}
								{formatDate(dbUser.created_at)}
							</div>
							<div>
								<span className="font-medium">
									Last Updated:
								</span>{" "}
								{formatDate(dbUser.updated_at)}
							</div>
							<div>
								<span className="font-medium">Role:</span>{" "}
								<Badge
									variant={
										dbUser.roles === "admin"
											? "destructive"
											: "outline"
									}
								>
									{dbUser.roles || "user"}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

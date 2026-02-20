import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
	userId: string;
	username?: string;
	avatarUrl?: string;
	size?: "sm" | "md" | "lg";
	showName?: boolean;
	className?: string;
}

const sizeClasses = {
	sm: "h-6 w-6 text-xs",
	md: "h-8 w-8 text-sm",
	lg: "h-10 w-10 text-base",
};

const textSizeClasses = {
	sm: "text-xs",
	md: "text-sm",
	lg: "text-base",
};

/**
 * UserAvatar component displays a Discord user's avatar with optional username
 *
 * @param userId - Discord user ID
 * @param username - Discord username (optional, for fallback)
 * @param avatarUrl - Full Discord CDN avatar URL (optional)
 * @param size - Avatar size (sm, md, lg)
 * @param showName - Whether to show username next to avatar
 * @param className - Additional CSS classes
 */
export function UserAvatar({
	userId,
	username,
	avatarUrl,
	size = "md",
	showName = false,
	className = "",
}: UserAvatarProps) {
	// Generate fallback initials from username or user ID
	const getInitials = () => {
		if (username) {
			return username.slice(0, 2).toUpperCase();
		}
		// Use first 2 chars of user ID as fallback
		return userId.slice(0, 2).toUpperCase();
	};

	const avatarContent = (
		<Avatar className={`${sizeClasses[size]} ${className}`}>
			{avatarUrl && (
				<AvatarImage src={avatarUrl} alt={username || userId} />
			)}
			<AvatarFallback>{getInitials()}</AvatarFallback>
		</Avatar>
	);

	if (showName) {
		return (
			<div className="flex items-center gap-2">
				{avatarContent}
				<span
					className={`${textSizeClasses[size]} group-hover:text-primary truncate font-medium duration-200`}
				>
					{username || `User ${userId.slice(0, 8)}`}
				</span>
			</div>
		);
	}

	return avatarContent;
}

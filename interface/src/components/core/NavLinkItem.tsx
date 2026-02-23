import Link from "next/link";

type NavLinkItemProps = {
	href: string;
	text: string;
	icon: React.ReactNode;
	className?: string;
};

export function NavLinkItem({ href, text, icon, className }: NavLinkItemProps) {
	return (
		<Link
			href={href}
			className={[
				"inline-flex items-center gap-2 rounded-md px-3 text-sm font-medium",
				"text-foreground/80 hover:text-secondary-foreground group",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
				className ?? "",
			].join(" ")}
			aria-label={text}
			title={text}
		>
			<span className="group-hover:text-primary mt-[0.5px] shrink-0">
				{icon}
			</span>

			{/* Hide text at/under sm, show from md up */}
			<span className="hidden md:inline">{text}</span>
		</Link>
	);
}

import { cn } from "@/lib/utils";

type FilterNavButtonProps = {
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
};

export function FilterNavButton({
	children,
	onClick,
	className,
}: FilterNavButtonProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"group flex h-10 w-10 cursor-pointer items-center justify-center gap-2 rounded-md px-2 text-foreground/75 hover:bg-background/50 hover:text-foreground lg:w-auto [&>svg]:text-muted-foreground group-hover:[&>svg]:text-foreground [&_span]:hidden lg:[&_span]:inline",
				className
			)}
		>
			{children}
		</button>
	);
}
 
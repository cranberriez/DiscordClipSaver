import { cn } from "@/lib/utils";

type FilterNavButtonProps = {
	children: React.ReactNode;
	onClick?: () => void;
	activeState?: boolean;
	className?: string;
};

export function FilterNavButton({
	children,
	onClick,
	activeState,
	className,
}: FilterNavButtonProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"group text-foreground/75 hover:bg-background/50 hover:text-foreground [&>svg]:text-muted-foreground group-hover:[&>svg]:text-foreground relative flex h-10 w-10 cursor-pointer items-center justify-center gap-2 rounded-md px-2 lg:w-auto [&_span]:hidden lg:[&_span]:inline",
				className
			)}
		>
			{activeState ? (
				<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500" />
			) : null}
			{children}
		</button>
	);
}

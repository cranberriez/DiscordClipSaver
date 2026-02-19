export function ItemGrid({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${className}`}>
			{children}
		</div>
	);
}

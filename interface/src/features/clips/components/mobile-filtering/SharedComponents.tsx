import { ReactNode } from "react";
import { ArrowLeft, Menu as MenuIcon, X } from "lucide-react";

export function SubMenuWrapper({
	title,
	onBack,
	children,
}: {
	title: string;
	onBack: () => void;
	children: ReactNode;
}) {
	return (
		<div className="flex h-full w-full shrink-0 flex-col overflow-hidden">
			<div className="border-border flex shrink-0 items-center gap-2 border-b p-3">
				<button
					onClick={onBack}
					className="hover:bg-muted rounded-md p-1.5 transition-colors"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<h3 className="text-base font-semibold">{title}</h3>
			</div>
			<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

export function MenuButton({
	onClick,
	isOpen,
}: {
	onClick: () => void;
	isOpen: boolean;
}) {
	return (
		<button
			onClick={onClick}
			aria-label="Toggle menu"
			aria-expanded={isOpen}
			className="hover:bg-background/50 relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg"
		>
			<X
				className={`absolute transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
				size={24}
			/>

			<div
				className={`absolute transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`}
			>
				<MenuIcon size={24} />
			</div>
		</button>
	);
}

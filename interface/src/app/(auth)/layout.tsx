export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="from-background via-background/95 to-primary/5 relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br p-4">
			<div className="bg-grid-white/[0.02] pointer-events-none absolute inset-0 bg-[size:60px_60px]" />
			<div className="bg-background pointer-events-none absolute h-full w-full [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
			<div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 w-full max-w-md duration-700">
				{children}
			</div>
		</div>
	);
}

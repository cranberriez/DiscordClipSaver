import { Lock } from "lucide-react";

export function AnnouncementBar() {
	return (
		<div className="flex w-full items-center justify-center border-t-[3px] border-[#7c5cbf] bg-[#1e1530] px-4 py-1">
			<div className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium tracking-wide">
				<Lock className="h-3.5 w-3.5 text-[#7c5cbf]" />
				<span className="text-white/80">
					Guild Moments is currently invite-only. Bot installation and
					new signups are paused.
				</span>
			</div>
		</div>
	);
}

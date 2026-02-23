// new landing page
import Image from "next/image";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CLIPS: ClipProps[] = [
	{
		title: "Super Battle Golf",
		date: "2026-02-14",
		color: "from-rose-500/20 to-orange-500/20",
		imageUrl:
			"https://clan.fastly.steamstatic.com/images//45941687/cfff0e5a8f673f4352f8341abb74197bf6965821.gif",
	},
	{
		title: "Deadlock",
		date: "2026-02-13",
		color: "from-emerald-500/20 to-teal-500/20",
		imageUrl: "/landing/deadlock_sample_gameplay.gif",
	},
	{
		title: "Battlefield 6",
		date: "2026-02-12",
		color: "from-blue-500/20 to-purple-500/20",
		imageUrl:
			"https://driffle.com/blog/wp-content/uploads/2025/08/202-ezgif.com-video-to-gif-converter-1.gif",
	},
	{
		title: "Valorant",
		date: "2026-02-11",
		color: "from-yellow-500/20 to-amber-500/20",
		imageUrl:
			"https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/hiddenblade/HxxzXhvo-heal.gif",
	},
	{
		title: "Overwatch 2",
		date: "2026-02-20",
		color: "from-cyan-500/20 to-blue-500/20",
		imageUrl: "https://giffiles.alphacoders.com/149/149792.gif",
	},
	{
		title: "Rocket League",
		date: "2026-02-19",
		color: "from-pink-500/20 to-rose-500/20",
		imageUrl:
			"https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyanNrMm0ydHc0bnFpZDZ0emRuYTlnbng4YnFpZm4zc3ZhaGphY2Q5YyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT0xepBLaRaduNgkne/giphy.gif",
	},
	{
		title: "Apex Legends",
		date: "2026-02-18",
		color: "from-indigo-500/20 to-purple-500/20",
		imageUrl:
			"https://media1.tenor.com/m/tGqTrIjt3M8AAAAd/apex-legends-pred.gif",
	},
	{
		title: "Minecraft",
		date: "2026-02-17",
		color: "from-green-500/20 to-emerald-500/20",
		imageUrl:
			"https://media1.tenor.com/m/-9aE98UXZbIAAAAd/minecraft-spin.gif",
	},
	{
		title: "League of Legends",
		date: "2026-02-16",
		color: "from-violet-500/20 to-fuchsia-500/20",
		imageUrl:
			"https://media1.tenor.com/m/socOXqaZaAMAAAAC/yasuo-e-league-of-legends.gif",
	},
	{
		title: "CS:GO 2",
		date: "2026-02-15",
		color: "from-orange-500/20 to-yellow-500/20",
		imageUrl:
			"https://media1.tenor.com/m/UFM-AOkKu5MAAAAd/guidini-cs-go.gif",
	},
	{
		title: "Fortnite",
		date: "2026-02-14",
		color: "from-blue-400/20 to-indigo-600/20",
		imageUrl:
			"https://media1.tenor.com/m/mIaPtfJ4XZIAAAAd/fortnite-wildcat.gif",
	},
	{
		title: "Rust",
		date: "2026-02-13",
		color: "from-red-500/20 to-zinc-500/20",
		imageUrl: "https://media1.tenor.com/m/yfnkt0pk3CgAAAAd/rust-dance.gif",
	},
];

// --- Sub-component: ClipItem ---
interface ClipProps {
	title: string;
	date: string;
	color: string;
	imageUrl?: string;
}

const ClipItem = ({ title, date, color, imageUrl }: ClipProps) => (
	<div className="group mb-4 w-full">
		<div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-white/5 bg-[#0d0d12] shadow-sm transition-all duration-300 group-hover:border-white/10">
			{imageUrl ? (
				<Image
					src={imageUrl}
					alt={title}
					fill
					className="object-cover opacity-75 transition-opacity duration-500 group-hover:opacity-100"
					unoptimized={imageUrl.endsWith(".gif")}
				/>
			) : (
				<div
					className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20`}
				/>
			)}

			{/* Play Icon */}
			<div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-black/40 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
				<div className="ml-0.5 h-0 w-0 border-t-[4px] border-b-[4px] border-l-[7px] border-t-transparent border-b-transparent border-l-white/60" />
			</div>
		</div>

		<div className="mt-1 flex items-center gap-1 px-1">
			<div
				className={cn(
					"mt-[1px] h-[9px] w-[9px] rounded-full bg-gradient-to-br",
					color
				)}
			/>

			<div className="max-w-[80px] truncate text-[10px] font-bold text-zinc-500">
				{title}
			</div>
			<div className="ml-auto font-mono text-[8px] font-bold text-zinc-600">
				{date}
			</div>
		</div>
	</div>
);

// --- Main Page ---
export const Hero = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
	return (
		<div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#0d0d12] p-10 text-white selection:bg-indigo-500/30">
			<style>{`
        @keyframes scroll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .animate-loop {
          animation: scroll 30s linear infinite;
        }
      `}</style>

			<main className="mb-8 grid w-full max-w-[1600px] items-center gap-12 xl:grid-cols-[1fr_1.5fr] xl:gap-4">
				{/* Left Content: Smaller scale */}
				<div className="z-10 space-y-6 text-center xl:text-left">
					<h1 className="text-5xl leading-[1.1] font-bold tracking-tight md:text-6xl">
						Your Clips. <br />
						Your Moments. <br />
						<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent italic">
							All in One Place.
						</span>
					</h1>

					<p className="text-muted-foreground mx-auto max-w-md text-base leading-relaxed md:text-lg xl:mx-0">
						Automatically capture, organize, and search through all
						your Discord server&apos;s clips.
					</p>

					<div className="flex flex-wrap items-center justify-center gap-3 xl:justify-start">
						{isAuthenticated ? (
							<Link
								href="/clips"
								className="bg-primary hover:bg-primary-hover rounded-lg px-6 py-2.5 text-xs font-bold shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
							>
								View Clips
							</Link>
						) : (
							<Link
								href="/login"
								className="bg-primary hover:bg-primary-hover rounded-lg px-6 py-2.5 text-xs font-bold shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
							>
								Sign Up
							</Link>
						)}

						<Link
							href="/docs"
							className="hover:text-accent-foreground bg-input/30 border-input hover:bg-input/50 rounded-lg border px-6 py-2.5 text-xs font-bold shadow-xs transition-all"
						>
							View Docs
						</Link>
					</div>

					<div className="flex justify-center gap-8 xl:justify-start">
						{["5+", "100+", "2k+"].map((val, i) => (
							<div key={i}>
								<div className="text-xl font-bold tracking-tight">
									{val}
								</div>
								<div className="mt-0.5 text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
									{["Servers", "Channels", "Clips"][i]}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right Preview: Wider, Glassy, and Proper Infinite Scroll */}
				<div className="relative isolate w-full overflow-visible pr-16 perspective-[2000px] xl:-ml-4">
					<div className="pointer-events-none absolute -inset-32 -z-20 rounded-full bg-[radial-gradient(circle_at_center,rgba(13,13,18,0)_0%,rgba(13,13,18,0.25)_55%,rgba(13,13,18,0.55)_75%,rgba(13,13,18,0.75)_100%)]" />
					<div className="pointer-events-none absolute -inset-28 -z-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.34)_0%,rgba(139,92,246,0.22)_24%,rgba(99,102,241,0.14)_42%,rgba(99,102,241,0.08)_58%,rgba(13,13,18,0)_88%)] blur-[170px]" />
					<div className="pointer-events-none absolute -inset-32 -z-10 rounded-full bg-[url('/landing/noise.png')] bg-repeat opacity-[0.22] mix-blend-soft-light" />

					<div className="bg-background/75 relative h-[400px] w-full rotate-x-[6deg] rotate-y-[-16deg] rotate-z-[2deg] transform overflow-hidden rounded-xl border border-white/5 shadow-2xl backdrop-blur-xl transition-all duration-700 sm:h-[800px] xl:rotate-x-[4deg] xl:rotate-y-[-20deg] xl:rotate-z-[3deg]">
						{/* Slim Glassy Browser Header */}
						<div className="absolute top-0 z-20 flex w-full items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2.5 backdrop-blur-md">
							<div className="flex gap-1.5">
								<div className="h-2 w-2 rounded-full bg-zinc-800" />
								<div className="h-2 w-2 rounded-full bg-zinc-800" />
								<div className="h-2 w-2 rounded-full bg-zinc-800" />
							</div>
							<div className="h-1.5 w-24 rounded-full bg-white/5" />
							<div className="h-4 w-4 rounded-full border border-white/5 bg-white/5" />
						</div>

						{/* Infinite Scrolling List */}
						<div className="relative h-full px-4 pt-12">
							<div className="animate-loop grid grid-cols-3 gap-4">
								{/* Double the array for the loop, but as a single block for CSS to move */}
								{[...CLIPS, ...CLIPS].map((clip, idx) => (
									<ClipItem
										key={`${clip.title}-${idx}`}
										{...clip}
									/>
								))}
							</div>
						</div>

						{/* Top & Bottom Mask */}
						<div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#121217] via-transparent via-50% to-[#121217] opacity-60" />
					</div>
				</div>
			</main>
		</div>
	);
};

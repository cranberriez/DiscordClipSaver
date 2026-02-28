import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { SectionLayout } from "./SectionLayout";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const plans = [
	{
		id: "hosted",
		name: "Hosted (Free)",
		price: "Free",
		cta: "Get Started",
		href: "/login",
		disabled: false,
		highlight: false,
	},
	{
		id: "premium",
		name: "Premium",
		price: "$9/mo",
		cta: "Coming Soon",
		href: "#",
		disabled: true,
		highlight: false,
	},
	{
		id: "pro",
		name: "Pro",
		price: "$29/mo",
		cta: "Coming Soon",
		href: "#",
		disabled: true,
		highlight: false,
	},
	{
		id: "selfHosted",
		name: "Self-Hosted",
		price: "Free",
		cta: "View Guide",
		href: "/docs/self-hosting",
		disabled: false,
		highlight: true,
	},
];

type FeatureValue = string | boolean;

interface Feature {
	name: string;
	subtext?: string;
	tooltip?: string;
	hosted: FeatureValue;
	premium: FeatureValue;
	pro: FeatureValue;
	selfHosted: FeatureValue;
}

const features: Feature[] = [
	{
		name: "New clips ingested",
		subtext: "(per month)",
		tooltip: "New clips saved (retries don't count).",
		hosted: "200",
		premium: "2,000",
		pro: "10,000",
		selfHosted: "Unlimited",
	},
	{
		name: "Messages processed",
		subtext: "(per month)",
		tooltip: "Messages read during scans/indexing.",
		hosted: "1M",
		premium: "25M",
		pro: "100M",
		selfHosted: "Unlimited",
	},
	{
		name: "Active servers",
		hosted: "1",
		premium: "5",
		pro: "20+",
		selfHosted: "Unlimited",
	},
	{
		name: "Concurrent scans",
		hosted: "1",
		premium: "3",
		pro: "10",
		selfHosted: "Unlimited",
	},
	{
		name: "Job priority",
		hosted: "Low",
		premium: "Normal",
		pro: "High",
		selfHosted: "—",
	},
	{
		name: "One-time backfill boost",
		subtext: "(per new server)",
		hosted: "+200 clips\n+2M msgs",
		premium: "+2,000 clips\n+25M msgs",
		pro: "+10,000 clips\n+100M msgs",
		selfHosted: "—",
	},
];

function FeatureCell({ value }: { value: FeatureValue }) {
	if (typeof value === "boolean") {
		return value ? (
			<Check className="h-[18px] w-[18px] text-[#818cf8]" />
		) : (
			<span className="text-[#3f3f46]">—</span>
		);
	}
	return (
		<span className="leading-tight whitespace-pre-line text-zinc-400">
			{value}
		</span>
	);
}

export function PricingSection() {
	return (
		<SectionLayout>
			<TooltipProvider delayDuration={300}>
				<div className="flex flex-col items-center gap-12 md:gap-16">
					<div className="max-w-2xl space-y-5 px-4 text-center">
						<div className="space-y-3">
							<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
								PRICING
							</div>
							<h2 className="text-3xl font-bold tracking-tight md:text-4xl md:leading-[1.15]">
								Choose your plan
							</h2>
						</div>
						<p className="text-[16px] text-zinc-400">
							From free to premium, we have a plan that fits your
							community&apos;s needs.
						</p>
					</div>

					<div className="mx-auto w-full max-w-[900px] overflow-x-auto">
						<div className="relative flex min-w-[600px] gap-4 px-2 pb-4">
							{/* Features Labels Column */}
							<div className="flex w-[180px] shrink-0 flex-col pt-8 pb-8">
								<div className="mb-6 flex h-[80px] items-center">
									<span className="text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
										{" "}
									</span>
								</div>
								<div className="space-y-4">
									{features.map((feature, i) => (
										<div
											key={i}
											className="flex h-[60px] flex-col justify-center text-[14px] leading-tight font-medium text-zinc-200"
										>
											<div className="flex items-center gap-1.5">
												<span>{feature.name}</span>
												{feature.tooltip && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Info className="h-3.5 w-3.5 shrink-0 text-zinc-500 hover:text-zinc-300" />
														</TooltipTrigger>
														<TooltipContent
															side="right"
															className="max-w-[200px] text-center"
														>
															<p>
																{
																	feature.tooltip
																}
															</p>
														</TooltipContent>
													</Tooltip>
												)}
											</div>
											{feature.subtext && (
												<span className="mt-1 text-[12px] font-normal text-zinc-500">
													{feature.subtext}
												</span>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Plan Columns Grid */}
							<div className="flex flex-1 gap-4">
								{plans.map((plan) => (
									<div
										key={plan.id}
										className={`flex flex-1 flex-col rounded-3xl pt-8 pb-4 ${
											plan.highlight
												? "border border-[#818cf8]/30 bg-[#818cf8]/[0.05]"
												: "border border-white/[0.03] bg-[#0c0c10]"
										}`}
									>
										{/* Plan Header */}
										<div className="mb-6 flex h-[80px] flex-col items-center justify-center text-center">
											<h4
												className={`text-[16px] font-bold ${plan.highlight ? "text-[#818cf8]" : "text-zinc-100"}`}
											>
												{plan.name}
											</h4>
											<span className="mt-1 text-[14px] font-medium text-zinc-500">
												{plan.price}
											</span>
										</div>

										{/* Plan Features */}
										<div className="space-y-4 px-2">
											{features.map((feature, i) => (
												<div
													key={i}
													className="flex h-[60px] items-center justify-center text-center text-[14px]"
												>
													<FeatureCell
														value={
															feature[
																plan.id as keyof Omit<
																	Feature,
																	| "name"
																	| "subtext"
																	| "tooltip"
																>
															]
														}
													/>
												</div>
											))}
										</div>

										{/* Plan Action */}
										<div className="mt-8 flex justify-center px-4">
											<Button
												className={`w-full max-w-[140px] rounded-xl text-[14px] font-medium`}
												variant={
													plan.highlight
														? "default"
														: "secondary"
												}
												disabled={plan.disabled}
												asChild={!plan.disabled}
											>
												{plan.disabled ? (
													<span className="opacity-50">
														{plan.cta}
													</span>
												) : (
													<Link href={plan.href}>
														{plan.cta}
													</Link>
												)}
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="max-w-2xl space-y-2 px-4 text-center text-[13px] text-zinc-500">
						<p>
							Thumbnails are included with all clips. Failed
							thumbnail attempts/retries don&apos;t count toward
							limits.
						</p>
						<p>
							Limits reset monthly and are enforced per server
							owner. Backfill boosts are one-time per newly added
							server, expire after 14 days, and don&apos;t roll
							over.
						</p>
						<p>
							Recommended usage: Free (~6 clips/day), Premium (~65
							clips/day), Pro (~333 clips/day).
						</p>
					</div>
				</div>
			</TooltipProvider>
		</SectionLayout>
	);
}

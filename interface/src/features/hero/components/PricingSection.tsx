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
		// Mobile accent
		accent: "#5ac8a0",
		accentBg: "rgba(90,200,160,0.08)",
		accentBorder: "rgba(90,200,160,0.25)",
		badge: "Recommended",
	},
	{
		id: "premium",
		name: "Premium",
		price: "$9/mo",
		cta: "Coming Soon",
		href: "#",
		disabled: true,
		highlight: false,
		accent: "#f0a050",
		accentBg: "rgba(240,160,80,0.08)",
		accentBorder: "rgba(240,160,80,0.2)",
		badge: "Most Popular",
	},
	{
		id: "pro",
		name: "Pro",
		price: "$29/mo",
		cta: "Coming Soon",
		href: "#",
		disabled: true,
		highlight: false,
		accent: "#e05a7a",
		accentBg: "rgba(224,90,122,0.08)",
		accentBorder: "rgba(224,90,122,0.2)",
		badge: "Power Users",
	},
	{
		id: "selfHosted",
		name: "Self-Hosted",
		price: "Free",
		cta: "View Guide",
		href: "/docs/self-hosting",
		disabled: false,
		highlight: true,
		accent: "#818cf8",
		accentBg: "rgba(129,140,248,0.08)",
		accentBorder: "rgba(129,140,248,0.3)",
		badge: "Full Control",
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
		<span className="leading-tight whitespace-pre-line text-zinc-300">
			{value}
		</span>
	);
}

export function PricingSection() {
	return (
		<SectionLayout>
			<TooltipProvider delayDuration={300}>
				<div className="flex flex-col items-center gap-12 lg:gap-16">
					{/* Heading — shared */}
					<div className="max-w-2xl space-y-5 px-4 text-center">
						<div className="space-y-3">
							<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
								PRICING
							</div>
							<h2 className="text-3xl font-bold tracking-tight lg:text-4xl lg:leading-[1.15]">
								Choose your plan
							</h2>
						</div>
						<p className="text-[16px] text-zinc-400">
							From free to premium, we have a plan that fits your
							community&apos;s needs.
						</p>
					</div>

					{/* ── DESKTOP TABLE (hidden below lg) ── */}
					<div className="mx-auto hidden w-full max-w-[900px] overflow-x-auto lg:block">
						<div className="relative flex min-w-[600px] gap-1 px-2 pb-4 lg:gap-4">
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
							<div className="flex flex-1 gap-1 lg:gap-4">
								{plans.map((plan) => (
									<div
										key={plan.id}
										className={`flex flex-1 flex-col rounded-3xl pt-8 pb-4 ${
											plan.highlight
												? "border border-[#818cf8]/30 bg-[#818cf8]/[0.05]"
												: "border border-white/[0.03] bg-[#0c0c10]"
										}`}
									>
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

										<div className="mt-8 flex justify-center px-4">
											<Button
												className="w-full max-w-[140px] rounded-xl text-[14px] font-medium"
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

					{/* ── MOBILE TABS + CARDS (hidden at lg and above) ── */}
					<div className="w-full px-4 lg:hidden">
						{/*
						 * Pure-CSS tab switching.
						 * All radio inputs, the tab bar, and all cards are DIRECT children
						 * of .pricing-tabs-root so the general sibling combinator (~) works
						 * without needing to pierce nested wrappers.
						 *
						 * Structure (flat siblings inside .pricing-tabs-root):
						 *   <input id="tab-hosted" />        ← sibling 1
						 *   <input id="tab-premium" />       ← sibling 2
						 *   <input id="tab-pro" />           ← sibling 3
						 *   <input id="tab-selfHosted" />    ← sibling 4
						 *   <div class="tab-bar">            ← sibling 5 (labels inside)
						 *   <div data-card="hosted">         ← sibling 6
						 *   <div data-card="premium">        ← sibling 7
						 *   …
						 *
						 * CSS: #tab-hosted:checked ~ [data-card="hosted"] { display: block }
						 * This works because both the input and the card are direct siblings.
						 */}
						<style>{`
							.pricing-tabs-root [data-card] { display: none; }

							.pricing-tabs-root #tab-hosted:checked    ~ [data-card="hosted"]     { display: block; }
							.pricing-tabs-root #tab-premium:checked   ~ [data-card="premium"]    { display: block; }
							.pricing-tabs-root #tab-pro:checked       ~ [data-card="pro"]        { display: block; }
							.pricing-tabs-root #tab-selfHosted:checked ~ [data-card="selfHosted"] { display: block; }

							.pricing-tabs-root #tab-hosted:checked    ~ .tab-bar label[for="tab-hosted"]     { background: rgba(255,255,255,0.07); }
							.pricing-tabs-root #tab-premium:checked   ~ .tab-bar label[for="tab-premium"]    { background: rgba(255,255,255,0.07); }
							.pricing-tabs-root #tab-pro:checked       ~ .tab-bar label[for="tab-pro"]        { background: rgba(255,255,255,0.07); }
							.pricing-tabs-root #tab-selfHosted:checked ~ .tab-bar label[for="tab-selfHosted"] { background: rgba(255,255,255,0.07); }
						`}</style>

						<div className="pricing-tabs-root">
							{/* Radio inputs — flat, direct children, visually hidden */}
							{plans.map((plan, i) => (
								<input
									key={plan.id}
									type="radio"
									id={`tab-${plan.id}`}
									name="pricing-tab"
									className="sr-only"
									defaultChecked={i === 0}
								/>
							))}

							{/* Tab bar — also a direct child so radios above are true siblings */}
							<div className="tab-bar mb-5 flex gap-1.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10] p-1.5">
								{plans.map((plan) => (
									<label
										key={plan.id}
										htmlFor={`tab-${plan.id}`}
										className="flex-1 cursor-pointer rounded-xl px-1 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-zinc-500"
									>
										{plan.name
											.replace(" (Free)", "")
											.replace(
												"Self-Hosted",
												"Self-Host"
											)}
									</label>
								))}
							</div>

							{/* Cards — direct children, each toggled by its matching radio */}
							{plans.map((plan) => {
								const planKey = plan.id as keyof Omit<
									Feature,
									"name" | "subtext" | "tooltip"
								>;
								return (
									<div key={plan.id} data-card={plan.id}>
										<div
											className="rounded-3xl border px-5 pt-6 pb-5"
											style={{
												borderColor: plan.accentBorder,
												background: plan.accentBg,
											}}
										>
											{/* Header */}
											<div className="mb-5 flex items-start justify-between">
												<div>
													<h4
														className="text-[18px] leading-tight font-bold"
														style={{
															color: plan.accent,
														}}
													>
														{plan.name}
													</h4>
													<div className="mt-1 flex items-center gap-2">
														<span className="text-[15px] font-semibold text-zinc-200">
															{plan.price}
														</span>
														<span
															className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
															style={{
																color: plan.accent,
																background:
																	plan.accentBg,
																border: `1px solid ${plan.accentBorder}`,
															}}
														>
															{plan.badge}
														</span>
													</div>
												</div>
											</div>

											{/* Feature rows */}
											<div className="divide-y divide-white/[0.05]">
												{features.map((feature, i) => (
													<div
														key={i}
														className="flex items-center justify-between gap-3 py-3"
													>
														<div className="flex min-w-0 items-center gap-1.5">
															<span className="text-[12px] leading-tight font-medium text-zinc-100">
																{feature.name}
																{feature.subtext && (
																	<span className="ml-1 text-[11px] text-zinc-400">
																		{
																			feature.subtext
																		}
																	</span>
																)}
															</span>
															{feature.tooltip && (
																<Tooltip>
																	<TooltipTrigger
																		asChild
																	>
																		<Info className="h-3 w-3 shrink-0 text-zinc-500 hover:text-zinc-300" />
																	</TooltipTrigger>
																	<TooltipContent
																		side="top"
																		className="max-w-[180px] text-center"
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
														<div
															className="shrink-0 text-right text-[12px] font-semibold whitespace-pre-line"
															style={{
																color:
																	feature[
																		planKey
																	] ===
																	"Unlimited"
																		? plan.accent
																		: undefined,
															}}
														>
															<FeatureCell
																value={
																	feature[
																		planKey
																	]
																}
															/>
														</div>
													</div>
												))}
											</div>

											{/* CTA */}
											<div className="mt-5">
												<Button
													className="w-full rounded-xl text-[14px] font-semibold"
													variant={
														plan.highlight
															? "default"
															: "outline"
													}
													style={
														!plan.highlight
															? {
																	borderColor:
																		plan.accent,
																	color: plan.accent,
																	background:
																		"transparent",
																}
															: undefined
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
									</div>
								);
							})}
						</div>
					</div>

					{/* Footer note — shared */}
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

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { SectionLayout } from "./SectionLayout";

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
	hosted: FeatureValue;
	premium: FeatureValue;
	selfHosted: FeatureValue;
}

const features: Feature[] = [
	{
		name: "Messages per month",
		hosted: "1,000",
		premium: "50,000",
		selfHosted: "Unlimited",
	},
	{
		name: "Active servers",
		hosted: "1",
		premium: "5",
		selfHosted: "Unlimited",
	},
	{
		name: "Monitored channels",
		hosted: "3 per server",
		premium: "Unlimited",
		selfHosted: "Unlimited",
	},
	{
		name: "Advanced search & filters",
		hosted: false,
		premium: true,
		selfHosted: true,
	},
	{
		name: "Unlimited clip retention",
		hosted: false,
		premium: true,
		selfHosted: true,
	},
	{
		name: "Your own infrastructure",
		hosted: false,
		premium: false,
		selfHosted: true,
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
	return <span className="text-zinc-400">{value}</span>;
}

export function PricingSection() {
	return (
		<SectionLayout>
			<div className="flex flex-col items-center gap-12 md:gap-16">
				<div className="max-w-2xl space-y-5 px-4 text-center">
					<div className="space-y-3">
						<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
							PRICING
						</div>
						<h3 className="text-3xl font-bold tracking-tight md:text-4xl md:leading-[1.15]">
							Choose your plan
						</h3>
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
									FEATURES
								</span>
							</div>
							<div className="space-y-4">
								{features.map((feature, i) => (
									<div
										key={i}
										className="flex h-[52px] items-center text-[14px] font-medium text-zinc-200"
									>
										{feature.name}
									</div>
								))}
							</div>
						</div>

						{/* Plan Columns Grid */}
						<div className="flex flex-1 gap-4">
							{plans.map((plan) => (
								<div
									key={plan.id}
									className={`flex flex-1 flex-col rounded-3xl pt-8 pb-8 ${
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
												className="flex h-[52px] items-center justify-center text-center text-[14px]"
											>
												<FeatureCell
													value={
														feature[
															plan.id as keyof Feature
														]
													}
												/>
											</div>
										))}
									</div>

									{/* Plan Action */}
									<div className="mt-8 flex justify-center px-4">
										<Button
											className={`w-full max-w-[140px] rounded-full text-[14px] font-medium ${
												plan.highlight
													? "bg-[#818cf8] text-white hover:bg-[#6366f1]"
													: "bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white"
											}`}
											variant="ghost"
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
			</div>
		</SectionLayout>
	);
}

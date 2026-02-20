import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
	{
		name: "Hosted (Free)",
		price: "Free",
		description: "Perfect for small communities",
		features: [
			"1,000 messages/month",
			"1 owned server",
			"3 channels per server",
			"Basic search",
			"30-day clip retention",
		],
		cta: "Get Started",
		href: "/login",
	},
	{
		name: "Self-Hosted",
		price: "Free",
		description: "Host it yourself with full control",
		features: [
			"Unlimited messages",
			"Unlimited servers",
			"All channels enabled",
			"Full feature access",
			"Your own infrastructure",
		],
		cta: "View Guide",
		href: "/docs/self-hosting",
	},
	{
		name: "Premium",
		price: "$9",
		period: "/month",
		description: "For active gaming communities",
		features: [
			"50,000 messages/month",
			"5 owned servers",
			"Unlimited channels",
			"Advanced search & filters",
			"Unlimited clip retention",
		],
		cta: "Coming Soon",
		href: "#",
		disabled: true,
	},
];

export function PricingSection() {
	return (
		<div className="space-y-16 text-center">
			<div>
				<h2 className="mb-4 text-3xl font-bold md:text-4xl">
					Choose your plan
				</h2>
				<p className="text-muted-foreground text-lg">
					From free to enterprise, we have a plan that fits your needs
				</p>
			</div>

			<div className="grid gap-8 md:grid-cols-3">
				{plans.map((plan, index) => (
					<div
						key={index}
						className="border-border rounded-lg border p-6"
					>
						<div className="mb-6 text-center">
							<h3 className="mb-2 text-xl font-semibold">
								{plan.name}
							</h3>
							<div className="mb-2">
								<span className="text-3xl font-bold">
									{plan.price}
								</span>
								{plan.period && (
									<span className="text-muted-foreground">
										{plan.period}
									</span>
								)}
							</div>
							<p className="text-muted-foreground text-sm">
								{plan.description}
							</p>
						</div>

						<ul className="mb-6 space-y-3">
							{plan.features.map((feature, featureIndex) => (
								<li
									key={featureIndex}
									className="flex items-center gap-3"
								>
									<Check className="text-primary h-4 w-4 flex-shrink-0" />
									<span className="text-sm">{feature}</span>
								</li>
							))}
						</ul>

						<Button
							className="w-full"
							variant="outline"
							disabled={plan.disabled}
							asChild={!plan.disabled}
						>
							{plan.disabled ? (
								<span>{plan.cta}</span>
							) : (
								<Link href={plan.href}>{plan.cta}</Link>
							)}
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}

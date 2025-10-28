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
        <div className="text-center space-y-16">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Choose your plan
                </h2>
                <p className="text-lg text-muted-foreground">
                    From free to enterprise, we have a plan that fits your needs
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan, index) => (
                    <div
                        key={index}
                        className="p-6 rounded-lg border border-border"
                    >
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold mb-2">
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
                            <p className="text-sm text-muted-foreground">
                                {plan.description}
                            </p>
                        </div>

                        <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, featureIndex) => (
                                <li
                                    key={featureIndex}
                                    className="flex items-center gap-3"
                                >
                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
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

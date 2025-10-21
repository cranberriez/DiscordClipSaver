import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    if (!status) {
        return <Badge variant="outline">Unscanned</Badge>;
    }

    const variantMap: Record<
        string,
        "default" | "secondary" | "destructive" | "outline"
    > = {
        PENDING: "secondary",
        RUNNING: "default",
        SUCCEEDED: "outline",
        FAILED: "destructive",
        CANCELLED: "outline",
    };

    const colorMap: Record<string, string> = {
        PENDING:
            "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50",
        RUNNING:
            "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50",
        SUCCEEDED:
            "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50",
    };

    const variant = variantMap[status] || "outline";
    const customColor = colorMap[status];

    return (
        <Badge variant={variant} className={customColor}>
            {status}
        </Badge>
    );
}

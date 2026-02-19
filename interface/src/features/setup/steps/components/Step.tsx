import {
	CircleCheck,
	CircleAlert,
	CircleX,
	SquircleDashed,
	LoaderCircle,
} from "lucide-react";
import { SetupStepState } from "../types";

export function Step({
	title,
	children,
	state,
}: {
	title: string;
	children?: React.ReactNode;
	state?: SetupStepState;
}) {
	return (
		<div className="bg-card/50 flex w-full flex-col gap-4 rounded-lg border p-4">
			<div className="flex items-center gap-3">
				<CompletionIcon state={state} />
				<h2 className="text-lg font-semibold">{title}</h2>
			</div>
			{children && <div className="ml-8 space-y-2">{children}</div>}
		</div>
	);
}

function CompletionIcon({ state }: { state?: SetupStepState }) {
	if (state === "success") {
		return <CircleCheck className="text-green-600" />;
	} else if (state === "need_action") {
		return <CircleAlert className="text-yellow-600" />;
	} else if (state === "error") {
		return <CircleX className="text-red-600" />;
	} else if (state === "loading") {
		return <LoaderCircle className="animate-spin text-blue-600" />;
	} else {
		return <SquircleDashed className="text-gray-400" />;
	}
}

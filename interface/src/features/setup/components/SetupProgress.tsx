export function SetupProgress({
	finishedSteps,
	totalSteps,
}: {
	finishedSteps: number;
	totalSteps: number;
}) {
	return (
		<div>
			<p>
				{finishedSteps} / {totalSteps} Steps Complete
			</p>
		</div>
	);
}

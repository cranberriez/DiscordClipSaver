import React, { useRef } from "react";

interface IndeterminateCheckboxProps {
	checked: boolean;
	indeterminate: boolean;
	onChange: () => void;
}

export function IndeterminateCheckbox({
	checked,
	indeterminate,
	onChange,
}: IndeterminateCheckboxProps) {
	const ref = useRef<HTMLInputElement>(null);
	React.useEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	}, [indeterminate]);
	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			onChange={onChange}
			className="accent-primary h-4 w-4 cursor-pointer"
		/>
	);
}

export interface SettingMetadata {
	label: string;
	description: string;
	type: "text" | "number" | "boolean" | "select" | "textarea";
	options?: { value: string; label: string }[];
	min?: number;
	max?: number;
	placeholder?: string;
	advanced?: boolean; // If true, show in advanced section
}

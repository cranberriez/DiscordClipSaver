import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

export function SearchSubMenu({
	onBack,
	closeMenu,
}: {
	onBack: () => void;
	closeMenu: () => void;
}) {
	const { searchQuery, setSearchQuery } = useClipFiltersStore();
	const [query, setQuery] = useState(searchQuery);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchQuery(query);
		closeMenu();
	};

	return (
		<form onSubmit={handleSearch} className="flex flex-col gap-4 p-4">
			<Input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Search clips..."
				autoFocus
			/>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onBack}
					className="flex-1"
				>
					Cancel
				</Button>
				<Button type="submit" className="flex-1">
					Search
				</Button>
			</div>
		</form>
	);
}

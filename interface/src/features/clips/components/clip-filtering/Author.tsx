import { User } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

type AuthorProps = {
    authorCount: number;
};

export function AuthorFilter({ authorCount }: AuthorProps) {
    const { selectedGuildId, selectedAuthorIds, openAuthorModal } =
        useClipFiltersStore();

    const hasGuildSelected = !!selectedGuildId;

    const getAuthorButtonText = () => {
        if (!hasGuildSelected) return "Authors";
        if (selectedAuthorIds.length === 0) return "All Authors";
        if (selectedAuthorIds.length === authorCount) return "All Authors";
        return `${selectedAuthorIds.length} Author${
            selectedAuthorIds.length === 1 ? "" : "s"
        }`;
    };

    return (
        <FilterNavButton onClick={openAuthorModal}>
            <User className="h-5 w-5" />
            <span>{getAuthorButtonText()}</span>
        </FilterNavButton>
    );
}

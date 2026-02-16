import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useSession } from "next-auth/react";

export const userKeys = {
    all: ["user"] as const,
    me: () => [...userKeys.all, "me"] as const,
};

export interface UserData {
    discord: any;
    database: {
        id: string;
        username: string;
        discriminator: string;
        avatar_url: string | null;
        roles: string; // "user" | "admin"
        created_at: string;
        updated_at: string;
    } | null;
}

export function useUser() {
    const { status } = useSession();
    
    return useQuery({
        queryKey: userKeys.me(),
        queryFn: async () => {
            const data = await api.users.me();
            return data as UserData;
        },
        enabled: status === "authenticated",
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useIsSystemAdmin() {
    const { data: user } = useUser();
    return user?.database?.roles === "admin";
}

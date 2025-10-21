import { Navbar } from "@/components/composite/navbar";

type ClipsLayoutProps = {
    children: React.ReactNode;
};

export default function ClipsLayout({ children }: ClipsLayoutProps) {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
}

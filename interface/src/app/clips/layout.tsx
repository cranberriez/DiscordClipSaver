import { Toaster } from "sonner";

type ClipsLayoutProps = {
    children: React.ReactNode;
};

export default function ClipsLayout({ children }: ClipsLayoutProps) {
    return (
        <div className="h-screen w-screen overflow-hidden relative">
            {children}
            <Toaster 
                duration={5000} 
                theme="dark" 
                richColors 
                closeButton 
                toastOptions={{
                    style: { zIndex: 40 }
                }}
            />
        </div>
    );
}

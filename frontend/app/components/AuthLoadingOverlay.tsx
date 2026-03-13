type AuthLoadingOverlayProps = {
    open: boolean;
    title?: string;
    subtitle?: string;
};

export default function AuthLoadingOverlay({
    open,
    title = "Processing...",
    subtitle = "Please wait",
}: AuthLoadingOverlayProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-green-900/80 backdrop-blur-sm">
            <div className="w-full max-w-xs bg-white border-2 border-green-900 p-6 text-center shadow-[8px_8px_0px_0px_rgba(20,83,45,1)]">
                <div className="relative mx-auto mb-4 h-14 w-14">
                    <div className="absolute inset-0 rounded-full border-4 border-green-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-700 border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-green-900 font-black uppercase tracking-widest text-sm mb-2">{title}</h3>
                <p className="text-green-700 font-bold uppercase tracking-wider text-[10px]">{subtitle}</p>
            </div>
        </div>
    );
}

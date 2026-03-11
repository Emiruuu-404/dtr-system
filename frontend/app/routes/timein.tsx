import { useState } from "react";
import { QrCode, MapPin, Camera, UserCheck } from "lucide-react";

export default function TimeIn() {
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAction = (actionName: string) => {
        setLoading(true);
        setStatus(`Initializing ${actionName}...`);

        // Simulate a network/device request
        setTimeout(() => {
            setStatus(`${actionName} successful!`);
            setLoading(false);

            // Clear message after 3 seconds
            setTimeout(() => setStatus(null), 3000);
        }, 1500);
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <header className="mb-8 mt-4 text-center border-b-2 border-green-900 pb-6">
                <h1 className="text-3xl font-black text-green-900 mb-2 uppercase tracking-tight">Record Time</h1>
                <p className="text-green-800 font-bold uppercase tracking-widest text-xs">Choose a verification method</p>
            </header>

            {status && (
                <div className="mb-6 p-4 border-2 border-green-900 bg-green-100 text-green-900 font-bold text-center uppercase tracking-wider text-sm">
                    {status}
                </div>
            )}

            <div className="space-y-4">
                <button
                    onClick={() => handleAction('QR Scanner')}
                    disabled={loading}
                    className="w-full bg-white border-2 border-green-900 text-gray-900 p-0 transition-colors hover:bg-green-100 flex items-stretch justify-start font-black tracking-wide text-lg uppercase group disabled:opacity-50"
                >
                    <div className="bg-green-200 p-5 border-r-2 border-green-900 group-hover:bg-green-300 transition-colors">
                        <QrCode size={26} strokeWidth={3} className="text-green-900" />
                    </div>
                    <div className="flex items-center px-6">Scan QR Code</div>
                </button>

                <button
                    onClick={() => handleAction('GPS Location')}
                    disabled={loading}
                    className="w-full bg-white border-2 border-green-900 text-gray-900 p-0 transition-colors hover:bg-green-100 flex items-stretch justify-start font-black tracking-wide text-lg uppercase group disabled:opacity-50"
                >
                    <div className="bg-green-200 p-5 border-r-2 border-green-900 group-hover:bg-green-300 transition-colors">
                        <MapPin size={26} strokeWidth={3} className="text-green-900" />
                    </div>
                    <div className="flex items-center px-6">Get GPS Location</div>
                </button>

                <button
                    onClick={() => handleAction('Camera')}
                    disabled={loading}
                    className="w-full bg-white border-2 border-green-900 text-gray-900 p-0 transition-colors hover:bg-green-100 flex items-stretch justify-start font-black tracking-wide text-lg uppercase group disabled:opacity-50"
                >
                    <div className="bg-green-200 p-5 border-r-2 border-green-900 group-hover:bg-green-300 transition-colors">
                        <Camera size={26} strokeWidth={3} className="text-green-900" />
                    </div>
                    <div className="flex items-center px-6">Take Selfie</div>
                </button>

            </div>
        </div>
    );
}
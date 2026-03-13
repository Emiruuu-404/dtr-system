import type { Route } from "./+types/catchall";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "404 Not Found" },
        { name: "description", content: "Page not found" },
    ];
}

export default function CatchAll() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h1 className="text-4xl gap-2 font-bold text-gray-800 mb-4">404</h1>
            <p className="text-lg text-gray-600 mb-8">The requested page could not be found.</p>
            <a
                href="/"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
                Go back home
            </a>
        </div>
    );
}

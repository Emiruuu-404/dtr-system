import { type RouteConfig } from "@react-router/dev/routes";

export default [
    {
        path: "/",
        file: "./routes/dashboard.tsx",
    },
    {
        path: "/timein",
        file: "./routes/timein.tsx",
    },
    {
        path: "/leaderboards",
        file: "./routes/leaderboards.tsx",
    },
    {
        path: "/history",
        file: "./routes/history.tsx",
    },
    {
        path: "/reports",
        file: "./routes/reports.tsx",
    },
    {
        path: "/login",
        file: "./routes/login.tsx",
    },
    {
        path: "/register",
        file: "./routes/register.tsx",
    },
    {
        path: "/forgot-password",
        file: "./routes/forgot-password.tsx",
    },
    {
        path: "/settings",
        file: "./routes/settings.tsx",
    },
    {
        path: "/admin",
        file: "./routes/admin-dashboard.tsx",
    },
    {
        path: "/admin/login",
        file: "./routes/admin-login.tsx",
    },
    {
        path: "/chat",
        file: "./routes/chat.tsx"
    },
    {
        path: "*",
        file: "./routes/catchall.tsx",
    },
] satisfies RouteConfig;
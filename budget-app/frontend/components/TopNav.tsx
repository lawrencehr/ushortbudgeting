"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Home, Settings, Users } from "lucide-react";

export default function TopNav() {
    const pathname = usePathname();

    // Extract project ID from path
    // Expected format: /project/[id]/...
    const pathParts = pathname.split('/');
    const projectId = pathParts[1] === 'project' ? pathParts[2] : null;

    return (
        <nav className="space-x-1 flex text-sm items-center">
            <Link
                href="/"
                className={`px-3 py-2 rounded hover:bg-slate-800 transition-colors flex items-center gap-2 ${pathname === '/' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
            >
                <FolderOpen size={16} />
                Projects
            </Link>

            {projectId && (
                <Link
                    href={`/project/${projectId}`}
                    className={`px-3 py-2 rounded hover:bg-slate-800 transition-colors flex items-center gap-2 ${pathname === `/project/${projectId}` ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
                >
                    <Home size={16} />
                    Home
                </Link>
            )}

            {/* Only show Budget/Crew links if we are in a project context OR preserve legacy behavior? 
          User only asked for Home button. I will keep existing other links but point them correctly if possible.
          The original layout had /budget, /crew links which seem to assume a "current" budget implicitly or are legacy global pages.
          Given the transition to /project/[id], strictly relying on legacy global routes might be confusing.
          However, the user didn't ask to remove them, just change Dashboard -> Projects and add Home.
      */}

            <Link
                href="/crew"
                className={`px-3 py-2 rounded hover:bg-slate-800 transition-colors ${pathname.startsWith('/crew') ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
            >
                Crew
            </Link>

            <Link
                href="/settings"
                className={`px-3 py-2 rounded hover:bg-slate-800 transition-colors ${pathname.startsWith('/settings') ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
            >
                Settings
            </Link>
        </nav>
    );
}

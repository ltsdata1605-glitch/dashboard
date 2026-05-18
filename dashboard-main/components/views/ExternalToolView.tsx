
import React from 'react';

interface ExternalToolViewProps {
    url: string;
    title: string;
}

export default function ExternalToolView({ url, title }: ExternalToolViewProps) {
    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="flex-grow relative">
                <iframe 
                    src={url} 
                    className="absolute inset-0 w-full h-full border-none"
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

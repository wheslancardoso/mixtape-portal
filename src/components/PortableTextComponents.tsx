import React from 'react';
import { urlFor } from '../lib/sanity';

export const SanityImage = ({ value }: any) => {
    if (!value?.asset?._ref) {
        return null;
    }

    return (
        <figure className="relative w-full my-8">
            <div className="relative">
                <img
                    src={urlFor(value).width(800).fit('max').auto('format').url()}
                    alt={value.alt || 'Post image'}
                    className="w-full h-auto object-cover grayscale contrast-125"
                />
                {/* Noise Overlay */}
                <div
                    className="absolute inset-0 mix-blend-overlay opacity-50 pointer-events-none"
                    style={{ backgroundImage: "url('/overlay.png')", backgroundSize: 'cover' }}
                />
            </div>
            {value.caption && (
                <figcaption className="text-xs font-mono mt-2 text-gray-500 text-center uppercase tracking-wider">
                    {value.caption}
                </figcaption>
            )}
        </figure>
    );
};

export const H2 = ({ children }: any) => (
    <h2 className="text-3xl md:text-4xl font-headline uppercase font-bold mt-12 mb-6 border-b-4 border-ink inline-block pr-8">
        {children}
    </h2>
);

export const H3 = ({ children }: any) => (
    <h3 className="text-2xl md:text-3xl font-headline uppercase font-bold mt-8 mb-4">
        {children}
    </h3>
);

export const BulletList = ({ children }: any) => (
    <ul className="list-disc pl-6 mb-6 space-y-2 marker:text-safety-orange">
        {children}
    </ul>
);

export const NumberList = ({ children }: any) => (
    <ol className="list-decimal pl-6 mb-6 space-y-2 marker:text-ink font-bold">
        {children}
    </ol>
);

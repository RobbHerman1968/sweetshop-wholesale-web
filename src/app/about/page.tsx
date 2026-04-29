import { PublicSiteShell } from '@/components/public-site-shell';
import { SITE_MAIN_FOCUS_CLASS, SITE_MAIN_ID } from '@/lib/site-main';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

const BRAND_COLLECTIONS = [
    {
        name: 'Sweet Shop USA Bulk Chocolates',
        href: 'https://www.sweetshopusa.com/collections/truffles',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/TrufflesHangTag.jpg?v=1767393989&width=952',
        imageAlt: 'Sweet Shop USA Truffles Logo Image',
    },
    {
        name: "MRS. WEINSTEIN'S TOFFEE",
        href: 'https://www.sweetshopusa.com/collections/mrs-weinsteins-toffee',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/weinsteinbanner.jpg?v=1767393970&width=1500',
        imageAlt: 'Mrs Weinsteins Toffee Logo Image',
    },
    {
        name: 'BIG LITTLE FUDGE',
        href: 'https://www.sweetshopusa.com/collections/big-little-fudge',
        imageSrc: 'https://www.sweetshopusa.com/cdn/shop/collections/The_Great_Divide.jpg?v=1767042852&width=1800',
        imageAlt: 'Sweet Shop USA Big Little Fudge Logo Image',
    },
];

export default function AboutPage() {
    return (
        <PublicSiteShell>
            <main id={SITE_MAIN_ID} tabIndex={-1} className={cn('mx-auto max-w-6xl px-3 pb-14 pt-2 sm:px-4 sm:pb-16 sm:pt-3', SITE_MAIN_FOCUS_CLASS)}>
                <header className="mb-8 rounded-2xl border border-[#b89572] bg-linear-to-r from-[#3d2518] via-[#5c3820] to-[#3d2518] px-5 py-8 text-[#fdf7ef] shadow-lg sm:rounded-3xl sm:px-10 sm:py-10">
                    <h1 className="text-xl font-semibold uppercase tracking-[0.28em] text-[#f5d9b8] sm:text-2xl sm:tracking-[0.32em]">About Us</h1>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[#fdf7ef]/90 sm:text-sm">
                        Since 1953, Sweet Shop USA has been dedicated to preserving the craft of American handmade chocolates while serving retailers across the country.
                    </p>
                </header>

                <section className="mt-8 rounded-2xl border border-[#b89572] bg-[#fdf7ef] p-6 sm:p-8">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Since 1953</h2>
                    <p className="mt-4 text-xs leading-relaxed text-[#5c4032] sm:text-sm">
                        Sweet Shop USA, celebrating 70 years of handmade chocolates, was founded in Fort Worth, TX in 1953 and is a family-owned chocolate
                        manufacturer dedicated to preserving the craft of American handmade chocolates. Located in Mount Pleasant, Texas, the 80,000 square foot
                        factory makes Sweet Shop USA the largest handmade chocolate manufacturer in the country.
                    </p>
                    <p className="mt-4 text-xs leading-relaxed text-[#5c4032] sm:text-sm">
                        Sweet Shop USA has received national recognition for creating over 100 varieties of handmade pieces including various Truffles, Famous Brags,
                        Nuts and Chewies, and our signature Fudge Love. All natural handmade products are distributed to approximately 7000 retailers nationwide,
                        including gourmet, gift, coffee, floral, and specialty retailers as well as major department stores. Branded collections include Sweet Shop
                        USA label, Mrs. Weinstein&apos;s Gourmet Toffee and Price&apos;s Fine Chocolates. Price&apos;s Fine Chocolates was founded in Kansas City, Missouri
                        in 1919 and was known for their most popular creation: Annaclair&apos;s.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="https://www.sweetshopusa.com/collections/all"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-md border border-[#5c4032] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5c4032] transition hover:bg-[#5c4032] hover:text-[#fdf7ef]"
                        >
                            Shop Now
                        </Link>
                    </div>
                </section>

                <section className="mt-8">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5c4032]">Family of brands</h2>
                    <div className="mt-4 grid gap-6 md:grid-cols-3">
                        {BRAND_COLLECTIONS.map((brand) => (
                            <article key={brand.name} className="overflow-hidden rounded-2xl border border-[#b89572] bg-[#fdf7ef] shadow-sm">
                                <Link href={brand.href} target="_blank" rel="noreferrer" className="block">
                                    <div className="relative aspect-4/3">
                                        <Image src={brand.imageSrc} alt={brand.imageAlt} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5c4032]">{brand.name}</p>
                                    </div>
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </PublicSiteShell>
    );
}

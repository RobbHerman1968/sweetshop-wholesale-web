import Image from 'next/image';
import { cn } from '@/lib/utils';

type RemoteImageProps = {
    src: string;
    alt?: string;
    className?: string;
    /** Hint for responsive srcset selection. Match the rendered CSS width. */
    sizes: string;
    fill?: boolean;
    width?: number;
    height?: number;
    priority?: boolean;
};

export function RemoteImage({
    src,
    alt = '',
    className,
    sizes,
    fill = true,
    width,
    height,
    priority = false,
}: RemoteImageProps) {
    const trimmed = src?.trim();
    if (!trimmed) return null;

    if (fill) {
        return (
            <Image
                src={trimmed}
                alt={alt}
                fill
                sizes={sizes}
                priority={priority}
                className={cn('object-cover', className)}
            />
        );
    }

    return (
        <Image
            src={trimmed}
            alt={alt}
            width={width ?? 256}
            height={height ?? 256}
            sizes={sizes}
            priority={priority}
            className={cn('object-cover', className)}
        />
    );
}

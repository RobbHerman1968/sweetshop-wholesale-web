import Image from '@tiptap/extension-image';

export type ImageAlignValue = 'left' | 'center' | 'right';

export const RICH_TEXT_IMAGE_ALIGN_CLASSES =
    '[&_img[data-align=center]]:mx-auto [&_img[data-align=center]]:block [&_img[data-align=right]]:ml-auto [&_img[data-align=right]]:mr-0 [&_img[data-align=right]]:block';

export const ImageWithAlign = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: 'left' satisfies ImageAlignValue,
                parseHTML: (element) => {
                    const align = element.getAttribute('data-align');
                    if (align === 'center' || align === 'right') return align;
                    return 'left';
                },
                renderHTML: (attributes) => {
                    if (!attributes.align || attributes.align === 'left') {
                        return {};
                    }
                    return {
                        'data-align': attributes.align,
                    };
                },
            },
        };
    },
});

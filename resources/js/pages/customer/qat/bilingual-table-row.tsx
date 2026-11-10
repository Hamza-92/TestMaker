import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Measure authored tables at their natural width before assigning language
 * columns. Inline styles also carry the chosen layout into print/PDF clones.
 */
export function BilingualTableRow({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = ref.current;

        if (!root) {
            return;
        }

        root.style.removeProperty('grid-template-columns');
        delete root.dataset.qatTableLayout;

        if (!root.querySelector('table')) {
            return;
        }

        let disposed = false;
        const measure = () => {
            if (disposed) {
                return;
            }

            const columns = Array.from(root.children).filter(
                (child): child is HTMLElement => child instanceof HTMLElement,
            );
            const style = getComputedStyle(root);
            const available =
                root.clientWidth -
                (Number.parseFloat(style.paddingLeft) || 0) -
                (Number.parseFloat(style.paddingRight) || 0);

            if (columns.length !== 2 || available === 0) {
                return;
            }

            const widths = columns.map((column) => {
                let required = 0;
                column
                    .querySelectorAll<HTMLTableElement>('table')
                    .forEach((table) => {
                        if (table.parentElement?.closest('table')) {
                            return;
                        }

                        const originalStyle = table.getAttribute('style');
                        table.style.setProperty(
                            'max-width',
                            'none',
                            'important',
                        );
                        const width = table.getBoundingClientRect().width;

                        if (originalStyle === null) {
                            table.removeAttribute('style');
                        } else {
                            table.setAttribute('style', originalStyle);
                        }

                        const content =
                            table.closest<HTMLElement>('.qat-rich-text');
                        const inset = content
                            ? Math.max(
                                  0,
                                  column.clientWidth - content.clientWidth,
                              )
                            : 0;
                        required = Math.max(required, Math.ceil(width + inset));
                    });

                return required;
            });
            const gap = Number.parseFloat(style.columnGap) || 0;
            const space = available - gap;
            const stacked = widths[0] + widths[1] > space;
            root.dataset.qatTableLayout = stacked ? 'stacked' : 'side-by-side';
            root.style.gridTemplateColumns = stacked
                ? 'minmax(0, 1fr)'
                : widths.every((width) => width <= space / 2)
                  ? 'repeat(2, minmax(0, 1fr))'
                  : `minmax(${widths[0]}px, 1fr) minmax(${widths[1]}px, 1fr)`;
        };

        measure();
        let lastWidth = root.clientWidth;
        const observer = new ResizeObserver(() => {
            if (root.clientWidth !== lastWidth) {
                lastWidth = root.clientWidth;
                measure();
            }
        });
        observer.observe(root);
        root.addEventListener('load', measure, true);
        document.fonts.addEventListener('loadingdone', measure);
        void document.fonts.ready.then(measure);

        return () => {
            disposed = true;
            observer.disconnect();
            root.removeEventListener('load', measure, true);
            document.fonts.removeEventListener('loadingdone', measure);
        };
    }, [children]);

    return (
        <div
            ref={ref}
            className={`grid min-w-0 grid-cols-2 gap-3 ${className}`}
        >
            {children}
        </div>
    );
}

import { cloneElement } from 'react';
import Skeleton from 'react-loading-skeleton';

/** Keep the real control's responsive size while its value is unavailable. */
export default function LoadingField({ loading, children }) {
    if (!loading) return children;
    const checkbox = children.props.type === 'checkbox';
    return (
        <span aria-hidden="true" className={checkbox ? 'relative inline-flex' : 'relative block w-full'}>
            {cloneElement(children, {
                disabled: true,
                tabIndex: -1,
                style: { ...children.props.style, visibility: 'hidden' },
            })}
            <Skeleton height="100%" containerClassName="absolute inset-0 block leading-none" />
        </span>
    );
}

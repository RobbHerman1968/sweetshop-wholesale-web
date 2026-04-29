'use client';

import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const NavigationMenu = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <NavigationMenuPrimitive.Root
        ref={ref}
        className={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
        {...props}
    >
        {children}
    </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
    <NavigationMenuPrimitive.List
        ref={ref}
        className={cn('group flex flex-1 list-none items-center justify-center gap-1 sm:gap-2', className)}
        {...props}
    />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
    <NavigationMenuPrimitive.Item ref={ref} className={cn('relative', className)} {...props} />
));
NavigationMenuItem.displayName = NavigationMenuPrimitive.Item.displayName;

const navigationMenuTriggerStyle = cn(
    'group inline-flex h-8 w-max items-center justify-center rounded-md bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5c4032] outline-none transition-colors hover:bg-[#f3e0cf] focus:bg-[#f3e0cf] focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-[#f3e0cf] sm:text-[11px] sm:tracking-[0.24em]',
);

const NavigationMenuTrigger = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <NavigationMenuPrimitive.Trigger
        ref={ref}
        className={cn(navigationMenuTriggerStyle, 'group', className)}
        {...props}
    >
        {children}{' '}
        <ChevronDown
            className="relative top-[1px] ml-0.5 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
        />
    </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
    <NavigationMenuPrimitive.Content
        ref={ref}
        className={cn(
            'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 absolute top-full left-0 z-50 mt-1.5 w-max max-w-[min(100vw-2rem,260px)] origin-top overflow-hidden rounded-md border border-[#d4c4b0] bg-white text-[#5c4032] shadow-md',
            className,
        )}
        {...props}
    />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

/** Add as a child of `NavigationMenu` if you want the shared viewport pattern; omit for per-trigger dropdowns. */
const NavigationMenuViewport = React.forwardRef<
    React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
    React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
    <div className={cn('absolute top-full left-0 flex justify-center')}>
        <NavigationMenuPrimitive.Viewport
            className={cn(
                'origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-[#d4c4b0] bg-white text-[#5c4032] shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]',
                className,
            )}
            ref={ref}
            {...props}
        />
    </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

export {
    navigationMenuTriggerStyle,
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuContent,
    NavigationMenuTrigger,
    NavigationMenuLink,
};

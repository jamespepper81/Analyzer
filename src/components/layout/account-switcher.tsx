'use client';

import * as React from 'react';
import { Bitcoin, Check, ChevronsUpDown, CirclePlus, X } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useWalletData, useWalletActions } from '@/contexts/wallet-context';
import { AddAccountDialog } from '@/components/layout/add-account-dialog';

export function AccountSwitcher() {
    const { activeXpub, xpubs } = useWalletData();
    const { setActiveXpub, removeXpub, refetch } = useWalletActions();
    const { isMobile, setOpenMobile } = useSidebar();
    const [isAddAccountDialogOpen, setAddAccountDialogOpen] = React.useState(false);
    const [isPopoverOpen, setPopoverOpen] = React.useState(false);

    if (!activeXpub) return null;

    const handleSelectWallet = (xpub: string) => {
        if (xpub === activeXpub) {
            refetch();
        } else {
            setActiveXpub(xpub);
        }
        setPopoverOpen(false);
        if (isMobile) {
            setOpenMobile(false);
        }
    }

    const handleAddWalletClick = () => {
        setPopoverOpen(false);
        setAddAccountDialogOpen(true);
    }

    const handleTriggerClick = (e: React.MouseEvent) => {
        if (isMobile) {
            e.stopPropagation();
        }
        setPopoverOpen((v) => !v);
    }

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div
                        role="button"
                        aria-label="Switch wallet"
                        tabIndex={0}
                        onClick={handleTriggerClick}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPopoverOpen((v) => !v);
                            }
                        }}
                        className={cn(
                            "grid w-full cursor-pointer items-center rounded-md py-2 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isMobile
                                ? "grid-cols-1 justify-items-center text-center gap-1 py-3"
                                : "grid-cols-[var(--sidebar-width-icon)_minmax(0,1fr)]"
                        )}
                    >
                        <div className="flex h-10 w-full items-center justify-center">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className='flex items-center justify-center bg-transparent'>
                                    <Bitcoin className="h-5 w-5 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div
                            className={cn(
                                "min-w-0 overflow-hidden pr-2 transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0",
                                isMobile && "pr-0 text-center"
                            )}
                        >
                            <div className={cn("flex items-center gap-2", isMobile && "flex-col gap-1")}>
                                <div className={cn("min-w-0 flex-1 text-left", isMobile && "text-center")}>
                                    <span className='block truncate font-semibold text-sm'>Active XPUB Key</span>
                                    <span className='block truncate font-mono text-xs text-muted-foreground'>{`${activeXpub.substring(0, 12)}...`}</span>
                                </div>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </div>
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverPortal>
                    <PopoverContent
                        className="w-[250px] p-0 mb-1"
                        side="top"
                        align="start"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => {
                             if (isMobile) {
                                e.preventDefault();
                             }
                        }}
                    >
                        <div className="space-y-1 p-2">
                            {xpubs.map((xpub) => (
                            <div
                                key={xpub}
                                onClick={() => handleSelectWallet(xpub)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectWallet(xpub);
                                    }
                                }}
                                className={cn(
                                    "group flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    activeXpub === xpub && "bg-primary text-primary-foreground"
                                )}
                                role="button"
                                tabIndex={0}
                            >
                                <Check className={cn("h-4 w-4 shrink-0", activeXpub === xpub ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1 truncate font-mono text-xs">{xpub}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100",
                                        activeXpub === xpub ? "hover:bg-primary/80" : "hover:bg-accent"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeXpub(xpub);
                                    }}
                                    disabled={xpubs.length <= 1}
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                            ))}
                        </div>
                        <Separator />
                        <div className="p-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleAddWalletClick}
                            >
                                <CirclePlus className="mr-2 h-4 w-4" />
                                Add XPUB Key
                            </Button>
                        </div>
                    </PopoverContent>
                </PopoverPortal>
            </Popover>
            <AddAccountDialog open={isAddAccountDialogOpen} onOpenChange={setAddAccountDialogOpen} />
        </>
    )
}

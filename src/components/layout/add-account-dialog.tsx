'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useWalletActions } from '@/contexts/wallet-context';

const AddAccountFormSchema = z.object({
    xpub: z.string().min(1, { message: "XPUB key is required." }),
});

export function AddAccountDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { addXpub } = useWalletActions();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<z.infer<typeof AddAccountFormSchema>>({
        resolver: zodResolver(AddAccountFormSchema),
        defaultValues: { xpub: "" },
    });

    async function onSubmit(values: z.infer<typeof AddAccountFormSchema>) {
        setIsSubmitting(true);
        form.clearErrors('xpub');
        const result = await addXpub(values.xpub);
        if (result.error) {
            form.setError("xpub", { type: "manual", message: result.error });
        } else {
            toast({ title: "XPUB Key Added", description: "Successfully connected the new xpub." });
            onOpenChange(false);
            form.reset();
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New XPUB Key</DialogTitle>
                    <DialogDescription className="font-normal">
                        Enter a Bitcoin xpub key to add it to your list of wallets.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="xpub"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>XPUB Key</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter your xpub key..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Connecting...' : 'Add XPUB Key'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoaderCircle, Pencil } from 'lucide-react';

import { OstrichIcon } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSidebar } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/wallet-context';

const NostrFormSchema = z.object({
  nsec: z.string().startsWith('nsec1', { message: 'Nostr private key must start with "nsec1"' }),
});

const EditProfileSchema = z.object({
  display_name: z.string().max(50).optional(),
  name: z.string().max(50).optional(),
  about: z.string().max(1024).optional(),
  website: z.string().url({ message: 'Please enter a valid website URL.' }).optional().or(z.literal('')),
  picture: z.string().url({ message: 'Please enter a valid avatar URL.' }).optional().or(z.literal('')),
  banner: z.string().url({ message: 'Please enter a valid banner URL.' }).optional().or(z.literal('')),
  nip05: z.string().optional(),
  lud16: z.string().optional(),
});

/**
 * Sidebar-footer Nostr block: account summary/CTA plus the connect,
 * edit-profile, and save-xpubs dialogs (all portaled, so they can live here
 * even though the trigger renders inside the sidebar footer).
 */
export function NostrAccount() {
  const { nostrNpub, nostrProfile, isNostrReady, connectNostr, updateNostrProfile, showSaveXpubsPrompt, setShowSaveXpubsPrompt, saveXpubsToNostr } = useWallet();
  const { isMobile } = useSidebar();
  const { toast } = useToast();
  const [isNostrDialogOpen, setNostrDialogOpen] = React.useState(false);
  const [isEditProfileOpen, setEditProfileOpen] = React.useState(false);

  const nostrForm = useForm<z.infer<typeof NostrFormSchema>>({
      resolver: zodResolver(NostrFormSchema),
      defaultValues: { nsec: "" },
  });

  const editProfileForm = useForm<z.infer<typeof EditProfileSchema>>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: {
      display_name: "",
      name: "",
      about: "",
      website: "",
      picture: "",
      banner: "",
      nip05: "",
      lud16: "",
    }
  });

  React.useEffect(() => {
    if (isEditProfileOpen && nostrProfile) {
      editProfileForm.reset({
        display_name: nostrProfile.display_name || '',
        name: nostrProfile.name || '',
        about: nostrProfile.about || '',
        website: nostrProfile.website || '',
        picture: nostrProfile.picture || '',
        banner: nostrProfile.banner || '',
        nip05: nostrProfile.nip05 || '',
        lud16: nostrProfile.lud16 || '',
      });
    }
  }, [isEditProfileOpen, nostrProfile, editProfileForm]);

  async function onNostrSubmit(values: z.infer<typeof NostrFormSchema>) {
      const result = await connectNostr(values.nsec);
      if (result.success) {
          toast({ title: 'Nostr Connected', description: 'Your Nostr account has been associated.' });
          setNostrDialogOpen(false);
          nostrForm.reset();
      } else {
          nostrForm.setError('nsec', { type: 'manual', message: result.error });
      }
  }

  async function onEditProfileSubmit(values: z.infer<typeof EditProfileSchema>) {
      const result = await updateNostrProfile(values);
      if (result.success) {
          toast({ title: 'Profile Updated', description: 'Your Nostr profile has been published.' });
          setEditProfileOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
      }
  }

  const handleSaveXpubs = async () => {
    const result = await saveXpubsToNostr();
    if (result.success) {
        toast({ title: "XPUBs Saved", description: "Your xpub keys have been securely saved to your Nostr account." });
    } else {
        toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    }
    setShowSaveXpubsPrompt(false);
  };

  return (
    <>
      <div
        className={cn(
          "grid items-center rounded-md py-2",
          isMobile
            ? "grid-cols-1 justify-items-center text-center gap-1 py-3"
            : "grid-cols-[var(--sidebar-width-icon)_minmax(0,1fr)]"
        )}
      >
        <div className="flex h-10 w-full items-center justify-center">
          {nostrNpub ? (
            <Avatar className="h-8 w-8">
                <AvatarImage src={nostrProfile?.picture} alt={nostrProfile?.display_name || nostrProfile?.name || 'Nostr User'} />
                <AvatarFallback>
                    <OstrichIcon className="h-5 w-5 text-primary" />
                </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="flex items-center justify-center bg-transparent">
                <OstrichIcon className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div
          className={cn(
            "min-w-0 overflow-hidden pr-2 transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:opacity-0",
            isMobile && "pr-0 text-center"
          )}
        >
          {nostrNpub ? (
            <div className={cn("flex items-start gap-2", isMobile && "flex-col items-center gap-1")}>
              <div className={cn('min-w-0 flex-1', isMobile && "text-center")}>
                <span className='block truncate font-semibold text-sm'>{nostrProfile?.display_name || nostrProfile?.name || 'Nostr User'}</span>
                <span className='block truncate text-xs text-muted-foreground font-mono' title={nostrNpub}>{`${nostrNpub.substring(0, 12)}...`}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditProfileOpen(true)}>
                  <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className={cn('flex flex-col', isMobile && "items-center text-center")}>
                <span className='font-semibold text-sm truncate'>Nostr Account</span>
                <Button
                  variant="link"
                  size="sm"
                  className={cn(
                    "p-0 h-auto text-primary justify-start text-xs hover:no-underline",
                    isMobile && "justify-center"
                  )}
                  onClick={() => setNostrDialogOpen(true)}
                  disabled={!isNostrReady}
                >
                  {isNostrReady ? 'Connect Account' : <LoaderCircle className="h-3 w-3 animate-spin"/>}
                </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isNostrDialogOpen} onOpenChange={setNostrDialogOpen}>

          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Connect Nostr Account</DialogTitle>
                  <DialogDescription className="font-normal">
                      Enter your Nostr private key (nsec) to associate your account. Your key is stored locally in your browser and never sent to our servers.
                  </DialogDescription>
              </DialogHeader>
              <Form {...nostrForm}>
                  <form onSubmit={nostrForm.handleSubmit(onNostrSubmit)} className="space-y-4">
                      <FormField
                          control={nostrForm.control}
                          name="nsec"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Private Key (nsec)</FormLabel>
                                  <FormControl>
                                      <Input placeholder="nsec1..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="submit" disabled={nostrForm.formState.isSubmitting}>
                            {nostrForm.formState.isSubmitting ? 'Connecting...' : 'Connect'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileOpen} onOpenChange={setEditProfileOpen}>

          <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                  <DialogTitle>Edit Nostr Profile</DialogTitle>
                  <DialogDescription className="font-normal">
                      Update your public profile information. This will be published to the Nostr network.
                  </DialogDescription>
              </DialogHeader>
              <Form {...editProfileForm}>
                  <form onSubmit={editProfileForm.handleSubmit(onEditProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="display_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl><Input placeholder="Your public display name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl><Input placeholder="Your @username" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="picture"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Avatar URL</FormLabel>
                                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="banner"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Banner URL</FormLabel>
                                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <FormField
                          control={editProfileForm.control}
                          name="website"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Website</FormLabel>
                                  <FormControl><Input placeholder="https://your-website.com" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={editProfileForm.control}
                          name="about"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>About</FormLabel>
                                  <FormControl><Textarea placeholder="Tell everyone a bit about yourself." className="resize-y" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={editProfileForm.control}
                            name="lud16"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lightning Address</FormLabel>
                                    <FormControl><Input placeholder="user@domain.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editProfileForm.control}
                            name="nip05"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>NIP-05 Identifier</FormLabel>
                                    <FormControl><Input placeholder="user@domain.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <DialogFooter>
                          <Button type="submit" disabled={editProfileForm.formState.isSubmitting}>
                            {editProfileForm.formState.isSubmitting ? 'Publishing...' : 'Save and Publish'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveXpubsPrompt} onOpenChange={setShowSaveXpubsPrompt}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Save XPUB Keys to Nostr?</AlertDialogTitle>
                    <AlertDialogDescription className="font-normal">
                        Would you like to save your current list of xpub keys to your Nostr account? They will be encrypted so only you can access them. This allows you to sync your wallets across different devices. You can always manage your list of keys from within BitSleuth&apos;s account switcher.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>No, Thanks</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveXpubs}>Yes, Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

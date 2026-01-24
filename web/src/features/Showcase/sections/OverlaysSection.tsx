import React from "react";
import { Field } from "@base-ui/react/field";
import { Section, SectionGroup } from "../components";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
} from "@/components/ui";
import {
  Settings,
  Bell,
  Lock,
  ChevronDown,
  Copy,
  Pencil,
  Trash2,
  Share,
  Download,
  LogOut,
  UserPlus,
  CreditCard,
  MoreHorizontal,
  Volume2,
  User,
  Mail,
} from "lucide-react";

export function OverlaysSection() {
  return (
    <SectionGroup
      id="overlays"
      label="05"
      title="Overlays"
      description="Modal dialogs, sheets, popovers, and menus."
    >
      {/* Dialog & AlertDialog */}
      <Section
        title="Dialog & Alert Dialog"
        description="Modal windows for focused interactions."
      >
        <div className="flex flex-wrap gap-3">
          {/* Dialog */}
          <Dialog>
            <DialogTrigger>
              <Button variant="secondary">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you're
                  done.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="space-y-4">
                  <Field.Root>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input placeholder="Your name" defaultValue="John Doe" />
                    </div>
                  </Field.Root>
                  <Field.Root>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="Your email"
                        defaultValue="john@example.com"
                      />
                    </div>
                  </Field.Root>
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose>
                  <Button>Save changes</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Alert Dialog */}
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="destructive">Delete Item</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your item and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel>
                  <Button variant="secondary">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction>
                  <Button variant="destructive">Delete</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>

      {/* Sheet */}
      <Section
        title="Sheet"
        description="Slide-out panels from screen edges."
      >
        <div className="flex flex-wrap gap-3">
          <Sheet>
            <SheetTrigger>
              <Button variant="secondary">Open Right</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>
                  Manage your account preferences.
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-4">
                  <Field.Root>
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input defaultValue="John Doe" />
                    </div>
                  </Field.Root>
                  <div className="flex items-center justify-between py-2">
                    <Label>Dark Mode</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <Label>Notifications</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </SheetBody>
              <SheetFooter>
                <SheetClose>
                  <Button variant="secondary">Cancel</Button>
                </SheetClose>
                <SheetClose>
                  <Button>Save</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger>
              <Button variant="soft">Open Bottom</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[50vh]">
              <SheetHeader>
                <SheetTitle>Share</SheetTitle>
                <SheetDescription>
                  Share this with your team.
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="flex gap-4 justify-center py-4">
                  <Button variant="soft" size="lg">
                    <Mail className="size-5" />
                  </Button>
                  <Button variant="soft" size="lg">
                    <Share className="size-5" />
                  </Button>
                  <Button variant="soft" size="lg">
                    <Copy className="size-5" />
                  </Button>
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </Section>

      {/* Popover */}
      <Section
        title="Popover"
        description="Floating panels anchored to triggers."
      >
        <Popover>
          <PopoverTrigger>
            <Button variant="soft">
              <Settings className="size-4" />
              Quick Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-4">
              <p className="text-sm uppercase text-muted-foreground">
                Settings
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Notifications</span>
                  </div>
                  <Switch size="small" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Privacy mode</span>
                  </div>
                  <Switch size="small" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="size-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Sound</span>
                  </div>
                  <Switch size="small" defaultChecked />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Section>

      {/* Menu */}
      <Section
        title="Dropdown Menu"
        description="Contextual action lists."
      >
        <div className="flex flex-wrap gap-3">
          <Menu>
            <MenuTrigger>
              Actions
              <ChevronDown className="size-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuItem>
                <Pencil className="size-4" />
                Edit
                <MenuShortcut>⌘E</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <Copy className="size-4" />
                Duplicate
                <MenuShortcut>⌘D</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <Share className="size-4" />
                Share
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <Download className="size-4" />
                Download
              </MenuItem>
              <MenuSeparator />
              <MenuItem className="text-destructive">
                <Trash2 className="size-4" />
                Delete
                <MenuShortcut>⌘⌫</MenuShortcut>
              </MenuItem>
            </MenuContent>
          </Menu>

          <Menu>
            <MenuTrigger>
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuItem>
                <User className="size-4" />
                Profile
              </MenuItem>
              <MenuItem>
                <CreditCard className="size-4" />
                Billing
              </MenuItem>
              <MenuItem>
                <Settings className="size-4" />
                Settings
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <UserPlus className="size-4" />
                Invite users
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <LogOut className="size-4" />
                Log out
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </Section>

      {/* Context Menu */}
      <Section
        title="Context Menu"
        description="Right-click triggered menus."
      >
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Right-click here
              </p>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              <Pencil className="size-4" />
              Edit
              <ContextMenuShortcut>⌘E</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Copy className="size-4" />
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Share className="size-4" />
              Share
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive">
              <Trash2 className="size-4" />
              Delete
              <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Section>
    </SectionGroup>
  );
}

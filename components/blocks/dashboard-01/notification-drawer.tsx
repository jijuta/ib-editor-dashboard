"use client"

import * as React from "react"
import {
  IconBell,
  IconUserPlus,
  IconFileText,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconSettings,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type Notification = {
  id: number
  type: "info" | "warning" | "success" | "user"
  title: string
  description: string
  time: string
  read: boolean
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: "user",
    title: "New team member joined",
    description: "Emma Johnson joined the QA team",
    time: "5 minutes ago",
    read: false,
  },
  {
    id: 2,
    type: "success",
    title: "Deployment completed",
    description: "Version 2.5.1 successfully deployed to production",
    time: "15 minutes ago",
    read: false,
  },
  {
    id: 3,
    type: "warning",
    title: "High CPU usage detected",
    description: "Server load increased to 87% on production-01",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 4,
    type: "info",
    title: "Report generated",
    description: "Q4 analytics report is ready for review",
    time: "2 hours ago",
    read: true,
  },
  {
    id: 5,
    type: "success",
    title: "Backup completed",
    description: "Database backup finished successfully",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 6,
    type: "user",
    title: "User login",
    description: "Alice Chen logged in from San Francisco",
    time: "4 hours ago",
    read: true,
  },
  {
    id: 7,
    type: "info",
    title: "System maintenance scheduled",
    description: "Maintenance window: Saturday 2 AM - 4 AM",
    time: "5 hours ago",
    read: true,
  },
  {
    id: 8,
    type: "warning",
    title: "Password expiration",
    description: "Your password will expire in 3 days",
    time: "1 day ago",
    read: true,
  },
]

const getIcon = (type: Notification["type"]) => {
  switch (type) {
    case "user":
      return <IconUserPlus className="h-4 w-4" />
    case "success":
      return <IconCheck className="h-4 w-4" />
    case "warning":
      return <IconAlertTriangle className="h-4 w-4" />
    case "info":
      return <IconFileText className="h-4 w-4" />
  }
}

const getIconColor = (type: Notification["type"]) => {
  switch (type) {
    case "user":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "success":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "warning":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "info":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
  }
}

export function NotificationDrawer() {
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications)
  const [isOpen, setIsOpen] = React.useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <IconBell className="h-5 w-5" />
                Notifications
              </DrawerTitle>
              <DrawerDescription>
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <IconSettings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconBell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`flex gap-3 rounded-lg p-4 transition-colors ${
                      notification.read ? "bg-background" : "bg-muted/50"
                    } hover:bg-muted`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getIconColor(
                        notification.type
                      )}`}
                    >
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < notifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

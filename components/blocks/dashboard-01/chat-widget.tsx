"use client"

import * as React from "react"
import { IconSend, IconPlus, IconMail } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Message = {
  id: number
  user: string
  avatar: string
  message: string
  time: string
  isOwn: boolean
}

const initialMessages: Message[] = [
  {
    id: 1,
    user: "Alice Chen",
    avatar: "/avatars/01.png",
    message: "Hey team, just finished the Q4 report. Ready for review!",
    time: "10:30 AM",
    isOwn: false,
  },
  {
    id: 2,
    user: "You",
    avatar: "/avatars/shadcn.jpg",
    message: "Great work Alice! I'll take a look this afternoon.",
    time: "10:35 AM",
    isOwn: true,
  },
  {
    id: 3,
    user: "Bob Williams",
    avatar: "/avatars/02.png",
    message: "Can someone help with the deployment issue?",
    time: "11:15 AM",
    isOwn: false,
  },
  {
    id: 4,
    user: "You",
    avatar: "/avatars/shadcn.jpg",
    message: "On it! Checking the logs now.",
    time: "11:16 AM",
    isOwn: true,
  },
]

export function ChatWidget() {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = React.useState("")
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteName, setInviteName] = React.useState("")

  const handleSend = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        user: "You",
        avatar: "/avatars/shadcn.jpg",
        message: inputValue,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        isOwn: true,
      }
      setMessages([...messages, newMessage])
      setInputValue("")
    }
  }

  const handleInvite = () => {
    if (inviteEmail.trim() && inviteName.trim()) {
      // Here you would typically send an API request to invite the user
      console.log("Inviting user:", { name: inviteName, email: inviteEmail })
      setInviteEmail("")
      setInviteName("")
      setIsInviteOpen(false)

      // Add system message to chat
      const systemMessage: Message = {
        id: messages.length + 1,
        user: "System",
        avatar: "/avatars/shadcn.jpg",
        message: `Invitation sent to ${inviteName} (${inviteEmail})`,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        isOwn: false,
      }
      setMessages([...messages, systemMessage])
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Chat</CardTitle>
            <CardDescription>Stay connected with your team</CardDescription>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <IconPlus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this team chat
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.avatar} alt={msg.user} />
                  <AvatarFallback>{msg.user.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${msg.isOwn ? "text-right" : ""}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    {msg.isOwn ? (
                      <>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                        <span className="text-sm font-medium">{msg.user}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{msg.user}</span>
                        <span className="text-xs text-muted-foreground">{msg.time}</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`inline-block rounded-lg px-3 py-2 text-sm ${
                      msg.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex w-full gap-2">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend()
              }
            }}
          />
          <Button size="icon" onClick={handleSend}>
            <IconSend className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

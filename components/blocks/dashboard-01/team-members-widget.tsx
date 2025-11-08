"use client"

import * as React from "react"
import { IconMail, IconPhone, IconMapPin, IconPlus, IconCheck } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type TeamMember = {
  id: number
  name: string
  role: string
  avatar: string
  email: string
  phone: string
  location: string
  status: "online" | "offline" | "away"
}

const allTeamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Alice Chen",
    role: "Product Manager",
    avatar: "/avatars/01.png",
    email: "alice@defenderx.com",
    phone: "+1 234 567 8901",
    location: "San Francisco, CA",
    status: "online",
  },
  {
    id: 2,
    name: "Bob Williams",
    role: "Senior Developer",
    avatar: "/avatars/02.png",
    email: "bob@defenderx.com",
    phone: "+1 234 567 8902",
    location: "New York, NY",
    status: "online",
  },
  {
    id: 3,
    name: "Carol Martinez",
    role: "UI/UX Designer",
    avatar: "/avatars/03.png",
    email: "carol@defenderx.com",
    phone: "+1 234 567 8903",
    location: "Austin, TX",
    status: "away",
  },
  {
    id: 4,
    name: "David Kim",
    role: "DevOps Engineer",
    avatar: "/avatars/04.png",
    email: "david@defenderx.com",
    phone: "+1 234 567 8904",
    location: "Seattle, WA",
    status: "offline",
  },
  {
    id: 5,
    name: "Emma Johnson",
    role: "QA Engineer",
    avatar: "/avatars/05.png",
    email: "emma@defenderx.com",
    phone: "+1 234 567 8905",
    location: "Boston, MA",
    status: "online",
  },
  {
    id: 6,
    name: "Frank Zhang",
    role: "Backend Developer",
    avatar: "/avatars/01.png",
    email: "frank@defenderx.com",
    phone: "+1 234 567 8906",
    location: "Los Angeles, CA",
    status: "away",
  },
  {
    id: 7,
    name: "Grace Lee",
    role: "Data Analyst",
    avatar: "/avatars/02.png",
    email: "grace@defenderx.com",
    phone: "+1 234 567 8907",
    location: "Chicago, IL",
    status: "offline",
  },
  {
    id: 8,
    name: "Henry Park",
    role: "Security Specialist",
    avatar: "/avatars/03.png",
    email: "henry@defenderx.com",
    phone: "+1 234 567 8908",
    location: "Denver, CO",
    status: "online",
  },
]

export function TeamMembersWidget() {
  const [selectedMembers, setSelectedMembers] = React.useState<number[]>([1, 2, 3, 4])
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const teamMembers = allTeamMembers.filter((member) =>
    selectedMembers.includes(member.id)
  )

  const toggleMember = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Your active team members</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <IconPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Team Members</DialogTitle>
                <DialogDescription>
                  Choose team members to display on your dashboard
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {allTeamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                        selectedMembers.includes(member.id)
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleMember(member.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {selectedMembers.includes(member.id) && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <IconCheck className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          member.status === "online"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : member.status === "away"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                    member.status === "online"
                      ? "bg-green-500"
                      : member.status === "away"
                      ? "bg-yellow-500"
                      : "bg-gray-400"
                  }`}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      member.status === "online"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : member.status === "away"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                    }
                  >
                    {member.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <IconMail className="h-3.5 w-3.5" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconPhone className="h-3.5 w-3.5" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconMapPin className="h-3.5 w-3.5" />
                    <span>{member.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

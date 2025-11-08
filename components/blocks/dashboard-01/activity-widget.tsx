"use client"

import {
  IconBell,
  IconUserPlus,
  IconFileText,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Activity = {
  id: number
  type: "info" | "warning" | "success" | "user"
  title: string
  description: string
  time: string
}

const activities: Activity[] = [
  {
    id: 1,
    type: "user",
    title: "New team member joined",
    description: "Emma Johnson joined the QA team",
    time: "5 minutes ago",
  },
  {
    id: 2,
    type: "success",
    title: "Deployment completed",
    description: "Version 2.5.1 successfully deployed to production",
    time: "15 minutes ago",
  },
  {
    id: 3,
    type: "warning",
    title: "High CPU usage detected",
    description: "Server load increased to 87% on production-01",
    time: "1 hour ago",
  },
  {
    id: 4,
    type: "info",
    title: "Report generated",
    description: "Q4 analytics report is ready for review",
    time: "2 hours ago",
  },
  {
    id: 5,
    type: "success",
    title: "Backup completed",
    description: "Database backup finished successfully",
    time: "3 hours ago",
  },
  {
    id: 6,
    type: "user",
    title: "User login",
    description: "Alice Chen logged in from San Francisco",
    time: "4 hours ago",
  },
   {
    id: 7,
    type: "info",
    title: "Report generated",
    description: "Q4 analytics report is ready for review",
    time: "2 hours ago",
  },
]

const getIcon = (type: Activity["type"]) => {
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

const getBadgeColor = (type: Activity["type"]) => {
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

export function ActivityWidget() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconBell className="h-5 w-5" />
          <CardTitle>Recent Activity</CardTitle>
        </div>
        <CardDescription>Latest updates and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 4).map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getBadgeColor(
                  activity.type
                )}`}
              >
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{activity.title}</p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

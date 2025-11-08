"use client"

import * as React from "react"
import {
  IconUsers,
  IconFileText,
  IconClock,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Stat = {
  id: number
  title: string
  value: string
  change: number
  icon: React.ReactNode
  description: string
}

const stats: Stat[] = [
  {
    id: 1,
    title: "Total Users",
    value: "2,847",
    change: 12.5,
    icon: <IconUsers className="h-5 w-5" />,
    description: "Active users this month",
  },
  {
    id: 2,
    title: "Documents",
    value: "1,429",
    change: 8.2,
    icon: <IconFileText className="h-5 w-5" />,
    description: "Files uploaded",
  },
  {
    id: 3,
    title: "Avg. Response",
    value: "245ms",
    change: -5.4,
    icon: <IconClock className="h-5 w-5" />,
    description: "API response time",
  },
]

export function StatsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
        <CardDescription>Key metrics at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {stat.icon}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div
                    className={`flex items-center text-xs font-medium ${
                      stat.change >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {stat.change >= 0 ? (
                      <IconArrowUpRight className="h-3 w-3" />
                    ) : (
                      <IconArrowDownRight className="h-3 w-3" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

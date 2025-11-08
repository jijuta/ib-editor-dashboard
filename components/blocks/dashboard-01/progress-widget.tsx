"use client"

import * as React from "react"
import { IconTarget, IconTrendingUp, IconClock } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type Project = {
  id: number
  name: string
  progress: number
  status: "on-track" | "at-risk" | "delayed"
  deadline: string
  tasksCompleted: number
  totalTasks: number
}

const projects: Project[] = [
  {
    id: 1,
    name: "Website Redesign",
    progress: 75,
    status: "on-track",
    deadline: "2 weeks",
    tasksCompleted: 18,
    totalTasks: 24,
  },
  {
    id: 2,
    name: "Mobile App Development",
    progress: 45,
    status: "on-track",
    deadline: "1 month",
    tasksCompleted: 9,
    totalTasks: 20,
  },
  {
    id: 3,
    name: "API Integration",
    progress: 60,
    status: "at-risk",
    deadline: "1 week",
    tasksCompleted: 12,
    totalTasks: 20,
  },
  {
    id: 4,
    name: "Security Audit",
    progress: 30,
    status: "delayed",
    deadline: "3 days",
    tasksCompleted: 6,
    totalTasks: 20,
  },
]

const getStatusColor = (status: Project["status"]) => {
  switch (status) {
    case "on-track":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "at-risk":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "delayed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
}

const getProgressColor = (status: Project["status"]) => {
  switch (status) {
    case "on-track":
      return "[&>div]:bg-green-500"
    case "at-risk":
      return "[&>div]:bg-yellow-500"
    case "delayed":
      return "[&>div]:bg-red-500"
  }
}

export function ProgressWidget() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconTarget className="h-5 w-5" />
          <CardTitle>Project Progress</CardTitle>
        </div>
        <CardDescription>Track your active projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{project.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconClock className="h-3 w-3" />
                    <span>{project.deadline}</span>
                    <span>•</span>
                    <span>
                      {project.tasksCompleted}/{project.totalTasks} tasks
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{project.progress}%</span>
                  <Badge variant="outline" className={getStatusColor(project.status)}>
                    {project.status.replace("-", " ")}
                  </Badge>
                </div>
              </div>
              <Progress value={project.progress} className={getProgressColor(project.status)} />
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconTrendingUp className="h-4 w-4" />
              <span>Overall Progress</span>
            </div>
            <span className="font-medium">
              {Math.round(
                projects.reduce((acc, p) => acc + p.progress, 0) / projects.length
              )}
              %
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

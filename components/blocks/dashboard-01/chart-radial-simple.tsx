"use client"

import * as React from "react"
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"

export const description = "A radial chart"

const chartData = [
  { name: "Completed", value: 75, fill: "var(--chart-1)" },
]

const chartConfig = {
  value: {
    label: "Progress",
  },
} satisfies ChartConfig

export function ChartRadialSimple() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Task Progress</CardTitle>
        <CardDescription>Current completion rate</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={90 - (chartData[0].value / 100) * 360}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              background
              cornerRadius={10}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="mt-4 text-center">
          <div className="text-3xl font-bold">{chartData[0].value}%</div>
          <div className="text-muted-foreground text-sm">Tasks Completed</div>
        </div>
      </CardContent>
    </Card>
  )
}

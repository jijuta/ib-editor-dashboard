"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Legend } from "recharts"

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A simple pie chart"

const chartData = [
  { category: "Desktop", value: 275, fill: "var(--chart-1)" },
  { category: "Mobile", value: 200, fill: "var(--chart-2)" },
  { category: "Tablet", value: 187, fill: "var(--chart-3)" },
  { category: "Other", value: 173, fill: "var(--chart-4)" },
]

const chartConfig = {
  value: {
    label: "Users",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  tablet: {
    label: "Tablet",
    color: "var(--chart-3)",
  },
  other: {
    label: "Other",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function ChartPie() {
  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>User Distribution</CardTitle>
        <CardDescription>By device type</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--card))" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 text-center">
          <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          <div className="text-muted-foreground text-sm">Total Users</div>
        </div>
      </CardContent>
    </Card>
  )
}

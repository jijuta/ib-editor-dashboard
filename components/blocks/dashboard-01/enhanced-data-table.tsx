"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { IconChevronDown, IconChevronUp, IconArrowsSort, IconLayoutGrid, IconTable, IconAdjustments, IconDownload, IconShare, IconStar, IconCalendar } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"

export type DataItem = {
  id: number
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
  priority: string
  department: string
  assignee: string
  dueDate: string
  progress: string
  budget: string
}

type EnhancedDataTableProps = {
  data: DataItem[]
}

export function EnhancedDataTable({ data }: EnhancedDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({})
  const [viewMode, setViewMode] = React.useState<"table" | "card">("table")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [columnSizing, setColumnSizing] = React.useState({})
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const columns: ColumnDef<DataItem>[] = [
    {
      accessorKey: "header",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Header
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("header")}</div>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Type
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground">
          {row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge
            variant="outline"
            className={
              status === "Done"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            }
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "target",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Target
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-right">{row.getValue("target")}</div>,
    },
    {
      accessorKey: "reviewer",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Reviewer
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("reviewer")}</div>,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Priority
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("priority")}</div>,
    },
    {
      accessorKey: "department",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Department
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("department")}</div>,
    },
    {
      accessorKey: "assignee",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Assignee
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("assignee")}</div>,
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Due Date
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("dueDate")}</div>,
    },
    {
      accessorKey: "progress",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Progress
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("progress")}</div>,
    },
    {
      accessorKey: "budget",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Budget
            {column.getIsSorted() === "asc" ? (
              <IconChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("budget")}</div>,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnPinning,
      columnSizing,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Tasks</CardTitle>
            <CardDescription>Manage and track project deliverables</CardDescription>
          </div>
          <div className="flex gap-2">
            {!isMobile && (
              <>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <IconTable className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                >
                  <IconLayoutGrid className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm">
              <IconDownload className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <IconShare className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <IconStar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-2">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Filter by header..."
              value={(table.getColumn("header")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("header")?.setFilterValue(event.target.value)
              }
              className="flex-1"
            />
            <Button variant="outline" className="shrink-0">Search</Button>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none justify-start">
                  <IconCalendar className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={isMobile ? 1 : 2}
                />
              </PopoverContent>
            </Popover>
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <IconAdjustments className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <div key={column.id} className="flex items-center justify-between px-2 py-1.5">
                          <DropdownMenuCheckboxItem
                            className="capitalize flex-1"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => column.pin("left")}
                            >
                              ← Pin
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => column.pin(false)}
                            >
                              Unpin
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {viewMode === "table" && !isMobile ? (
          <div className="rounded-md border w-full overflow-x-auto overflow-y-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className="relative border-r last:border-r-0"
                          style={{
                            minWidth: header.getSize(),
                            position: header.column.getIsPinned() ? "sticky" : "relative",
                            left: header.column.getIsPinned() === "left" ? `${header.column.getStart("left")}px` : undefined,
                            right: header.column.getIsPinned() === "right" ? `${header.column.getAfter("right")}px` : undefined,
                            zIndex: header.column.getIsPinned() ? 20 : 10,
                            backgroundColor: "hsl(var(--background))",
                          }}
                        >
                          <div className="flex items-center gap-2 pr-2">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </div>
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none hover:bg-primary ${
                              header.column.getIsResizing() ? "bg-primary" : ""
                            }`}
                          />
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="border-b"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="border-r last:border-r-0"
                          style={{
                            minWidth: cell.column.getSize(),
                            position: cell.column.getIsPinned() ? "sticky" : "relative",
                            left: cell.column.getIsPinned() === "left" ? `${cell.column.getStart("left")}px` : undefined,
                            right: cell.column.getIsPinned() === "right" ? `${cell.column.getAfter("right")}px` : undefined,
                            zIndex: cell.column.getIsPinned() ? 1 : 0,
                            backgroundColor: "hsl(var(--background))",
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Card key={row.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {row.getValue("header")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{row.getValue("type")}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          (row.getValue("status") as string) === "Done"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }
                      >
                        {row.getValue("status")}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{row.getValue("target")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reviewer:</span>
                      <span>{row.getValue("reviewer")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Priority:</span>
                      <span className="font-medium">{row.getValue("priority")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span>{row.getValue("department")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Assignee:</span>
                      <span>{row.getValue("assignee")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span>{row.getValue("dueDate")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress:</span>
                      <span>{row.getValue("progress")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">{row.getValue("budget")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground">
                No results.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50, 100, 500, 1000].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()} ({table.getFilteredRowModel().rows.length} total)
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

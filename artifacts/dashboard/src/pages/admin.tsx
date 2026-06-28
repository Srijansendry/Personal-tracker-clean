import { useListTasks, useRescheduleTask, useUpdateTask, useDeleteTask, getListTasksQueryKey, getGetTaskSummaryQueryKey, getGetUserStatsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Edit3, Trash2, Search } from "lucide-react";

const rescheduleSchema = z.object({
  dueDate: z.string().min(1, "Date is required"),
  dueTime: z.string().optional(),
  note: z.string().optional(),
});

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: tasks = [], isLoading } = useListTasks({ status: 'all' });
  const updateTask = useUpdateTask();
  const rescheduleTask = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
  };

  const handleStatusChange = (taskId: number, newStatus: "pending" | "completed" | "missed") => {
    updateTask.mutate(
      { id: taskId, data: { status: newStatus } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Status updated" });
        }
      }
    );
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTask.mutate(
      { id: taskId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Task deleted from system" });
        }
      }
    );
  };

  const RescheduleDialog = ({ task }: { task: any }) => {
    const form = useForm<z.infer<typeof rescheduleSchema>>({
      resolver: zodResolver(rescheduleSchema),
      defaultValues: {
        dueDate: task.dueDate || format(new Date(), 'yyyy-MM-dd'),
        dueTime: task.dueTime || "",
        note: "",
      }
    });

    const onSubmit = (values: z.infer<typeof rescheduleSchema>) => {
      rescheduleTask.mutate(
        { id: task.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            toast({ title: "Task rescheduled" });
          }
        }
      );
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <CalendarIcon className="w-3 h-3 mr-1" /> Reschedule
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Reason for rescheduling..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={rescheduleTask.isPending}>
                Confirm Reschedule
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Manage all tasks and override states.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>All Tasks System View</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs bg-background"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(tasks) &&
                    tasks
                      .filter((task) =>
                        task.title.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="text-muted-foreground text-xs">#{task.id}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate" title={task.title}>{task.title}</TableCell>
                          <TableCell>
                            {task.dueDate ? format(new Date(task.dueDate + 'T00:00:00'), 'MMM d, yyyy') : 'No date'}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={task.status} 
                              onValueChange={(val: any) => handleStatusChange(task.id, val)}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <RescheduleDialog task={task} />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

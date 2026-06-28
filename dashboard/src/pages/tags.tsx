import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListTags, useCreateTag, getListTagsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Tag as TagIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().optional(),
});

export default function Tags() {
  const { data: tags = [], isLoading } = useListTags();
  const createTag = useCreateTag();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tagSchema>>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "#FFB6C1",
      icon: "",
    },
  });

  const onSubmit = (values: z.infer<typeof tagSchema>) => {
    createTag.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() });
          toast({ title: "Tag created successfully!" });
          form.reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Tags & Categories</h1>
        <p className="text-muted-foreground">Organize your life with colorful labels.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Create New Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tag Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Work, Health" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                          <Input type="color" {...field} className="w-12 h-10 p-1 cursor-pointer" />
                          <Input type="text" {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createTag.isPending} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Create Tag
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-secondary/10">
          <CardHeader>
            <CardTitle className="text-lg">Your Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading tags...</p>
            ) : tags.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tags created yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm bg-card"
                    style={{ borderColor: tag.color }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="font-medium text-sm">{tag.name}</span>
                    {tag.isCustom ? (
                      <span className="text-[10px] text-muted-foreground ml-1">Custom</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground ml-1">Predefined</span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

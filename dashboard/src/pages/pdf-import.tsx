import { useState } from "react";
import { useParsePdfTasks, useConfirmPdfTasks, getListTasksQueryKey, getGetTaskSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

// Use the locally-bundled worker (pdfjs v4+ dropped the cdnjs build)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfImport() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  const parsePdfTasks = useParsePdfTasks();
  const confirmPdfTasks = useConfirmPdfTasks();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    setExtractedTasks([]);
    setSelectedTasks(new Set());

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      // Send to API
      parsePdfTasks.mutate(
        { data: { text: fullText } },
        {
          onSuccess: (suggestions) => {
            setExtractedTasks(suggestions);
            // Auto-select highly confident tasks
            const initialSelected = new Set<number>();
            suggestions.forEach((s: any, idx: number) => {
              if (s.confidence > 0.6) initialSelected.add(idx);
            });
            setSelectedTasks(initialSelected);
            toast({ title: "Extraction complete", description: `Found ${suggestions.length} possible tasks.` });
          },
          onError: () => {
            toast({ title: "Extraction failed", description: "Could not parse tasks from this PDF.", variant: "destructive" });
          }
        }
      );
    } catch (error) {
      console.error(error);
      toast({ title: "Error reading PDF", description: "Could not read the file.", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleTaskSelection = (idx: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedTasks(newSelected);
  };

  const updateTaskField = (idx: number, field: string, value: any) => {
    const newTasks = [...extractedTasks];
    newTasks[idx] = { ...newTasks[idx], [field]: value };
    setExtractedTasks(newTasks);
  };

  const handleSaveConfirmed = () => {
    const tasksToSave = Array.from(selectedTasks).map(idx => {
      const t = extractedTasks[idx];
      return {
        title: t.title,
        description: t.description || undefined,
        dueDate: t.dueDate || undefined,
        priority: t.priority || "medium",
        fromPdf: true
      };
    });

    if (tasksToSave.length === 0) return;

    confirmPdfTasks.mutate(
      { data: { tasks: tasksToSave } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
          toast({ title: "Tasks saved!", description: `Successfully imported ${tasksToSave.length} tasks.` });
          setExtractedTasks([]);
          setSelectedTasks(new Set());
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">PDF Import</h1>
        <p className="text-muted-foreground">Extract tasks directly from your syllabus or meeting notes.</p>
      </div>

      {!extractedTasks.length && !isExtracting && !parsePdfTasks.isPending && (
        <label className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center bg-card flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:bg-primary/5 transition-colors group">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">Click or drag PDF to upload</p>
          <p className="text-sm text-muted-foreground mt-2">We'll automatically extract tasks, dates, and priorities.</p>
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
        </label>
      )}

      {(isExtracting || parsePdfTasks.isPending) && (
        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg font-medium">Analyzing document...</p>
            <p className="text-sm text-muted-foreground">Extracting tasks using AI.</p>
          </CardContent>
        </Card>
      )}

      {extractedTasks.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-accent/20 p-4 rounded-lg border border-accent/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
              <div>
                <h3 className="font-bold">Review Extracted Tasks</h3>
                <p className="text-sm text-muted-foreground">Select the ones you want to keep and adjust details if needed.</p>
              </div>
            </div>
            <Button 
              onClick={handleSaveConfirmed} 
              disabled={selectedTasks.size === 0 || confirmPdfTasks.isPending}
            >
              Save {selectedTasks.size} Tasks
            </Button>
          </div>

          <div className="space-y-4">
            {extractedTasks.map((task, idx) => {
              const isSelected = selectedTasks.has(idx);
              return (
                <Card key={idx} className={`transition-all ${isSelected ? 'border-primary shadow-sm bg-card' : 'opacity-70 bg-muted/30'}`}>
                  <CardContent className="p-4 flex gap-4">
                    <Checkbox 
                      checked={isSelected} 
                      onCheckedChange={() => toggleTaskSelection(idx)}
                      className="mt-1.5"
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Input 
                          value={task.title} 
                          onChange={(e) => updateTaskField(idx, 'title', e.target.value)}
                          className="font-medium text-base border-transparent hover:border-input focus:border-input px-2 h-8"
                        />
                        <div className="flex items-center gap-2 mt-2 px-2">
                          {task.confidence < 0.5 && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 gap-1">
                              <AlertCircle className="w-3 h-3" /> Low Confidence
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">{Math.round(task.confidence * 100)}% Match</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 px-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
                          <Input 
                            type="date"
                            value={task.dueDate || ""} 
                            onChange={(e) => updateTaskField(idx, 'dueDate', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                          <select 
                            value={task.priority || "medium"} 
                            onChange={(e) => updateTaskField(idx, 'priority', e.target.value)}
                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

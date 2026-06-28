import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Trash2, Edit2, X, Code, FileImage, BookOpen,
  Calendar, Upload, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};

const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.9)",
  padding: "10px 14px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const TEXTAREA: React.CSSProperties = {
  ...INPUT,
  fontFamily: "'Fira Code', 'Courier New', monospace",
  resize: "vertical",
  minHeight: 120,
};

const DIFF_COLORS: Record<string, { color: string; bg: string }> = {
  Easy:   { color: "#90EE90", bg: "rgba(144,238,144,0.12)" },
  Medium: { color: "#FFD700", bg: "rgba(255,215,0,0.12)" },
  Hard:   { color: "#FF8C69", bg: "rgba(255,140,105,0.12)" },
};

const CAT_COLORS: Record<string, string> = {
  DOM: "#AFEEEE", React: "#61DBFB", CSS: "#FFB6C1", JavaScript: "#FFD700",
  TypeScript: "#4fc3f7", "Node.js": "#90EE90", APIs: "#C8A2C8",
  "Data Structures": "#FFB347", Algorithms: "#DDA0DD", "System Design": "#87CEEB",
  General: "rgba(255,255,255,0.4)", Other: "rgba(255,255,255,0.4)",
};

const WEBDEV_CATEGORIES = [
  "General", "DOM", "React", "CSS", "JavaScript", "TypeScript",
  "Node.js", "APIs", "Data Structures", "Algorithms", "System Design", "Other",
];

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// File uploader that returns a File object
function FileUploader({
  value, onChange, label, accept = "image/*,application/pdf",
}: {
  value: File | null;
  onChange: (f: File | null) => void;
  label: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { alert("File too large (max 20MB)"); return; }
    onChange(file);
  };

  return (
    <div>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>{label}</label>
      {value ? (
        <div style={{ position: "relative", padding: "10px 14px", background: "rgba(255,182,193,0.08)", border: "1px solid rgba(255,182,193,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <FileImage size={14} style={{ color: "#FFB6C1", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.name}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{(value.size / 1024).toFixed(0)}KB</span>
          <button type="button" onClick={() => onChange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FF8C69", padding: 2 }}><X size={12} /></button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? "rgba(255,182,193,0.5)" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", background: dragging ? "rgba(255,182,193,0.05)" : "transparent" }}
        >
          <Upload size={18} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Drop file or click to browse</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 2 }}>Images or PDF · max 20MB</div>
          <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}
    </div>
  );
}

// Displays a stored URL (image or PDF link)
function AttachmentView({ url, label }: { url: string; label: string }) {
  if (!url) return null;
  const isPdf = url.toLowerCase().includes(".pdf") || url.includes("application/pdf");
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      {isPdf ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#FFB6C1", fontSize: 13, textDecoration: "none" }}>
          <ExternalLink size={13} /> Open PDF
        </a>
      ) : (
        <img src={url} alt={label} style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", objectFit: "contain", maxHeight: 400 }} />
      )}
    </div>
  );
}

// ─── LeetCode ────────────────────────────────────────────────────────────────

function LeetcodeForm({
  initial, onSubmit, saving,
}: {
  initial?: any;
  onSubmit: (fd: FormData) => void;
  saving: boolean;
}) {
  const [num, setNum] = useState(initial?.problemNumber ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [diff, setDiff] = useState(initial?.difficulty ?? "Medium");
  const [date, setDate] = useState(initial?.dateSolved ?? new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState(initial?.codeSolution ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [notesTxt, setNotesTxt] = useState(initial?.notes ?? "");
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [codeFile, setCodeFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("problemNumber", num);
    fd.append("title", title);
    fd.append("difficulty", diff);
    fd.append("dateSolved", date);
    fd.append("codeSolution", code);
    fd.append("tags", tags);
    fd.append("notes", notesTxt);
    if (notesFile) fd.append("notesImage", notesFile);
    if (codeFile) fd.append("codeImage", codeFile);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Problem #</label>
          <input placeholder="791" value={num} onChange={(e) => setNum(e.target.value)} required style={INPUT} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Title</label>
          <input placeholder="Custom Sort String" value={title} onChange={(e) => setTitle(e.target.value)} required style={INPUT} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Difficulty</label>
          <select value={diff} onChange={(e) => setDiff(e.target.value)} style={INPUT as any}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Date Solved</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={INPUT} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Tags (comma-separated)</label>
        <input placeholder="Arrays, Two Pointers, HashMap" value={tags} onChange={(e) => setTags(e.target.value)} style={INPUT} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Text Notes</label>
        <textarea placeholder="Key observations, approach, time/space complexity..." value={notesTxt} onChange={(e) => setNotesTxt(e.target.value)} style={TEXTAREA} rows={3} />
      </div>
      <FileUploader value={notesFile} onChange={setNotesFile} label="Handwritten Notes Photo (upload to Supabase)" />
      {initial?.notesImageUrl && !notesFile && (
        <div style={{ fontSize: 11, color: "rgba(255,182,193,0.5)" }}>Current notes image stored ↗ — upload new to replace</div>
      )}
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Code Solution (text)</label>
        <textarea placeholder="Paste your solution..." value={code} onChange={(e) => setCode(e.target.value)} style={TEXTAREA} rows={5} />
      </div>
      <FileUploader value={codeFile} onChange={setCodeFile} label="Code Screenshot (upload to Supabase)" />
      {initial?.codeImageUrl && !codeFile && (
        <div style={{ fontSize: 11, color: "rgba(255,182,193,0.5)" }}>Current code image stored ↗ — upload new to replace</div>
      )}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving}
        style={{ padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #FFB6C1, #C8A2C8)", color: "#0a0a12", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving…" : "Save Record"}
      </motion.button>
    </form>
  );
}

function LeetcodeCard({ record, onDelete, onEdit }: { record: any; onDelete: () => void; onEdit: () => void }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const diff = DIFF_COLORS[record.difficulty] ?? DIFF_COLORS.Medium;
  const tagList: string[] = record.tags ? record.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <>
      <motion.div whileHover={{ y: -2 }} style={{ ...GLASS, padding: 18, cursor: "pointer" }} onClick={() => setDetailOpen(true)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>#{record.problemNumber}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: diff.color, background: diff.bg }}>{record.difficulty}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}><Edit2 size={12} /></button>
            <button onClick={onDelete} style={{ background: "rgba(255,80,80,0.1)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#FF8C69" }}><Trash2 size={12} /></button>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 8, lineHeight: 1.3 }}>{record.title}</div>
        {record.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{record.notes}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {tagList.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(200,162,200,0.12)", color: "#C8A2C8", border: "1px solid rgba(200,162,200,0.2)" }}>{t}</span>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={10} />{record.dateSolved}</span>
          {record.notesImageUrl && <span style={{ fontSize: 11, color: "rgba(255,182,193,0.6)", display: "flex", alignItems: "center", gap: 4 }}><FileImage size={10} />Notes</span>}
          {record.codeSolution && <span style={{ fontSize: 11, color: "rgba(144,238,144,0.6)", display: "flex", alignItems: "center", gap: 4 }}><Code size={10} />Code</span>}
        </div>
      </motion.div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent style={{ background: "rgba(8,8,14,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FFB6C1", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>#{record.problemNumber}</span>
              {record.title}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, color: diff.color, background: diff.bg }}>{record.difficulty}</span>
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} />{record.dateSolved}</span>
              {tagList.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(200,162,200,0.12)", color: "#C8A2C8" }}>{t}</span>)}
            </div>
            {record.notes && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap" }}>{record.notes}</div>
              </div>
            )}
            {record.notesImageUrl && <AttachmentView url={record.notesImageUrl} label="Handwritten Notes" />}
            {record.codeSolution && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Code Solution</div>
                <pre style={{ fontSize: 12, color: "#90EE90", background: "rgba(0,0,0,0.4)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{record.codeSolution}</pre>
              </div>
            )}
            {record.codeImageUrl && <AttachmentView url={record.codeImageUrl} label="Code Screenshot" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Web Dev ──────────────────────────────────────────────────────────────────

function WebdevForm({
  initial, onSubmit, saving,
}: {
  initial?: any;
  onSubmit: (fd: FormData) => void;
  saving: boolean;
}) {
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState(initial?.codeSnippet ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [notesTxt, setNotesTxt] = useState(initial?.notes ?? "");
  const [notesFile, setNotesFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("topic", topic);
    fd.append("category", category);
    fd.append("date", date);
    fd.append("codeSnippet", code);
    fd.append("tags", tags);
    fd.append("notes", notesTxt);
    if (notesFile) fd.append("notesFile", notesFile);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Topic</label>
        <input placeholder="DOM Manipulation, useState Hook…" value={topic} onChange={(e) => setTopic(e.target.value)} required style={INPUT} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={INPUT as any}>
            {WEBDEV_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={INPUT} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Tags</label>
        <input placeholder="Events, querySelector, addEventListener" value={tags} onChange={(e) => setTags(e.target.value)} style={INPUT} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Notes</label>
        <textarea placeholder="Key concepts, gotchas, links…" value={notesTxt} onChange={(e) => setNotesTxt(e.target.value)} style={TEXTAREA} rows={3} />
      </div>
      <FileUploader value={notesFile} onChange={setNotesFile} label="Notes Photo or PDF (upload to Supabase)" accept="image/*,application/pdf" />
      {initial?.notesUrl && !notesFile && (
        <div style={{ fontSize: 11, color: "rgba(255,182,193,0.5)" }}>Current notes file stored ↗ — upload new to replace</div>
      )}
      <div>
        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Code Snippet</label>
        <textarea placeholder="Paste your code here…" value={code} onChange={(e) => setCode(e.target.value)} style={TEXTAREA} rows={5} />
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving}
        style={{ padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #FFB6C1, #C8A2C8)", color: "#0a0a12", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving…" : "Save Note"}
      </motion.button>
    </form>
  );
}

function WebdevCard({ record, onDelete, onEdit }: { record: any; onDelete: () => void; onEdit: () => void }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const tagList: string[] = record.tags ? record.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
  const catColor = CAT_COLORS[record.category] ?? CAT_COLORS.General;

  return (
    <>
      <motion.div whileHover={{ y: -2 }} style={{ ...GLASS, padding: 18, cursor: "pointer" }} onClick={() => setDetailOpen(true)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: catColor, background: `${catColor}1a`, border: `1px solid ${catColor}33` }}>{record.category}</span>
          <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}><Edit2 size={12} /></button>
            <button onClick={onDelete} style={{ background: "rgba(255,80,80,0.1)", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#FF8C69" }}><Trash2 size={12} /></button>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 8, lineHeight: 1.3 }}>{record.topic}</div>
        {record.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{record.notes}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {tagList.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(200,162,200,0.12)", color: "#C8A2C8", border: "1px solid rgba(200,162,200,0.2)" }}>{t}</span>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}><Calendar size={10} />{record.date}</span>
          {record.notesUrl && <span style={{ fontSize: 11, color: "rgba(255,182,193,0.6)", display: "flex", alignItems: "center", gap: 4 }}><FileImage size={10} />Attachment</span>}
          {record.codeSnippet && <span style={{ fontSize: 11, color: "rgba(144,238,144,0.6)", display: "flex", alignItems: "center", gap: 4 }}><Code size={10} />Code</span>}
        </div>
      </motion.div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent style={{ background: "rgba(8,8,14,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FFB6C1", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {record.topic}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, color: catColor, background: `${catColor}1a` }}>{record.category}</span>
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} />{record.date}</span>
              {tagList.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(200,162,200,0.12)", color: "#C8A2C8" }}>{t}</span>)}
            </div>
            {record.notes && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap" }}>{record.notes}</div>
              </div>
            )}
            {record.notesUrl && <AttachmentView url={record.notesUrl} label="Notes Attachment" />}
            {record.codeSnippet && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Code Snippet</div>
                <pre style={{ fontSize: 12, color: "#90EE90", background: "rgba(0,0,0,0.4)", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{record.codeSnippet}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Notes() {
  const [tab, setTab] = useState<"leetcode" | "webdev">("leetcode");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const onSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data: leetcodeRecords = [], isLoading: lcLoading } = useQuery({
    queryKey: ["notes", "leetcode", debouncedSearch],
    queryFn: () => apiFetch(`/api/notes/leetcode${debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ""}`),
  });

  const { data: webdevRecords = [], isLoading: wdLoading } = useQuery({
    queryKey: ["notes", "webdev", debouncedSearch],
    queryFn: () => apiFetch(`/api/notes/webdev${debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ""}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notes", "leetcode"] });
    queryClient.invalidateQueries({ queryKey: ["notes", "webdev"] });
  };

  const handleAdd = async (fd: FormData) => {
    setAddSaving(true);
    try {
      const endpoint = tab === "leetcode" ? "/api/notes/leetcode" : "/api/notes/webdev";
      await apiFetch(endpoint, { method: "POST", body: fd });
      toast({ title: "Saved!", description: tab === "leetcode" ? `Problem #${fd.get("problemNumber")} recorded` : String(fd.get("topic")) });
      setAddOpen(false);
      invalidate();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  };

  const handleEdit = async (fd: FormData) => {
    if (!editingRecord) return;
    setEditSaving(true);
    try {
      const endpoint = tab === "leetcode" ? `/api/notes/leetcode/${editingRecord.id}` : `/api/notes/webdev/${editingRecord.id}`;
      await apiFetch(endpoint, { method: "PUT", body: fd });
      toast({ title: "Updated!" });
      setEditingRecord(null);
      invalidate();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this record permanently?")) return;
    try {
      const endpoint = tab === "leetcode" ? `/api/notes/leetcode/${id}` : `/api/notes/webdev/${id}`;
      await apiFetch(endpoint, { method: "DELETE" });
      toast({ title: "Deleted" });
      invalidate();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const isLoading = tab === "leetcode" ? lcLoading : wdLoading;
  const records = tab === "leetcode" ? leetcodeRecords : webdevRecords;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <BookOpen size={18} style={{ color: "#FFB6C1" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Revision Archive · Supabase Storage</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #fff 60%, #FFB6C1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Notes & Problems</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Photos and PDFs are stored in your Supabase project. Structured data stays in Postgres.</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["leetcode", "webdev"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); setDebouncedSearch(""); }}
              style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "linear-gradient(135deg, rgba(255,182,193,0.2), rgba(200,162,200,0.15))" : "transparent", color: tab === t ? "#FFB6C1" : "rgba(255,255,255,0.35)" }}>
              {t === "leetcode" ? "⚡ LeetCode" : "🌐 Web Dev"}
              <span style={{ marginLeft: 6, fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 5 }}>
                {t === "leetcode" ? leetcodeRecords.length : webdevRecords.length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
          <input
            placeholder={tab === "leetcode" ? "Search by number, title, tags…" : "Search by topic, category, tags…"}
            value={search} onChange={(e) => onSearchChange(e.target.value)}
            style={{ ...INPUT, paddingLeft: 36 }}
          />
          {search && <button onClick={() => onSearchChange("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}><X size={13} /></button>}
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(255,182,193,0.25), rgba(200,162,200,0.2))", color: "#FFB6C1", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <Plus size={15} /> {tab === "leetcode" ? "Add Problem" : "Add Note"}
            </motion.button>
          </DialogTrigger>
          <DialogContent style={{ background: "rgba(8,8,14,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "#FFB6C1" }}>{tab === "leetcode" ? "Record LeetCode Problem" : "Record Web Dev Note"}</DialogTitle>
            </DialogHeader>
            <div style={{ marginTop: 8 }}>
              {tab === "leetcode"
                ? <LeetcodeForm onSubmit={handleAdd} saving={addSaving} />
                : <WebdevForm onSubmit={handleAdd} saving={addSaving} />}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...GLASS, padding: 18, height: 140 }}>
              <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 10, width: "40%" }} />
              <div style={{ height: 16, borderRadius: 6, background: "rgba(255,255,255,0.04)", marginBottom: 8, width: "75%" }} />
              <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,0.03)", width: "60%" }} />
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...GLASS, padding: 48, textAlign: "center" }}>
          <BookOpen size={32} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
            {search ? `No results for "${search}"` : tab === "leetcode" ? "No LeetCode problems recorded yet" : "No web dev notes yet"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
            {search ? "Try a different search term" : `Click "Add ${tab === "leetcode" ? "Problem" : "Note"}" to get started`}
          </div>
        </motion.div>
      ) : (
        <motion.div layout style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          <AnimatePresence>
            {tab === "leetcode"
              ? records.map((r: any) => (
                  <motion.div key={r.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <LeetcodeCard record={r} onDelete={() => handleDelete(r.id)} onEdit={() => setEditingRecord(r)} />
                  </motion.div>
                ))
              : records.map((r: any) => (
                  <motion.div key={r.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <WebdevCard record={r} onDelete={() => handleDelete(r.id)} onEdit={() => setEditingRecord(r)} />
                  </motion.div>
                ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit dialog */}
      {editingRecord && (
        <Dialog open onOpenChange={() => setEditingRecord(null)}>
          <DialogContent style={{ background: "rgba(8,8,14,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "#FFB6C1" }}>{tab === "leetcode" ? "Edit Problem Record" : "Edit Web Dev Note"}</DialogTitle>
            </DialogHeader>
            <div style={{ marginTop: 8 }}>
              {tab === "leetcode"
                ? <LeetcodeForm initial={editingRecord} onSubmit={handleEdit} saving={editSaving} />
                : <WebdevForm initial={editingRecord} onSubmit={handleEdit} saving={editSaving} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

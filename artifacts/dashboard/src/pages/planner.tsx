import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";
import {
  Zap,
  Target,
  Award,
  Sparkles,
  CheckCircle2,
  Circle,
  Lock,
  Play,
  Clock,
  Flame,
  Code2,
  Cpu,
  Edit3,
  ExternalLink,
  Layers,
  Activity,
  Compass,
  Check,
  ChevronDown,
  RefreshCw,
  Calendar as CalendarIcon,
  LayoutGrid,
  Key,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Globe,
  X,
  BookOpen,
  FileText,
  StickyNote,
  Link2
} from "lucide-react";
import { TiltPanel } from "@/components/tilt-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useListTasks,
  useCreateTask,
  useCompleteTask,
  useUpdateTask,
  useGetUserStats,
  useGetTaskSummary,
  getListTasksQueryKey,
  getGetTaskSummaryQueryKey,
  getGetUserStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

interface Mission {
  id: string;
  dbTaskId?: number;
  phaseId: number;
  track: "MERN" | "JAVA_DSA" | "REST";
  module: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED" | "ELITE";
  xp: number;
  prerequisites: string;
  objectives: string[];
  practiceProblems?: string[];
  completed: boolean;
  isCurrent?: boolean;
}

interface CalendarTask {
  id: string;
  dateStr: string;
  dayOfWeek: string;
  track: "MERN" | "JAVA_DSA" | "REST";
  module: string;
  topic: string;
  details: string[];
  completed: boolean;
}

interface Problem {
  id: number;
  platform: "leetcode" | "gfg";
  problemSlug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: "classwork" | "homework";
  url: string;
  status: "pending" | "solved";
  solvedAt?: string;
}

interface ProblemSummary {
  leetcodeSolved: number;
  leetcodeTotal: number;
  gfgSolved: number;
  gfgTotal: number;
  classworkSolved: number;
  classworkTotal: number;
  homeworkSolved: number;
  homeworkTotal: number;
  totalSolved: number;
  totalProblems: number;
}

interface UserIntegration {
  id: number;
  platform: string;
  username: string;
  apiKey?: string;
  verified: boolean;
}

interface Phase {
  id: number;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  unlocked: boolean;
}

const START_DATE = new Date(2026, 5, 27);

const PHASES: Phase[] = [
  { id: 1, title: "PHASE 01: CORE ARCHITECTURE & LINKED SYSTEMS", subtitle: "JS Object Internals, DOM Engine & Java Linked Lists", icon: Cpu, color: "#FFB6C1", unlocked: true },
  { id: 2, title: "PHASE 02: ASYNC ENGINE & RECURSIVE DATA", subtitle: "Promises, Async/Await, Stacks, Queues & Recursion", icon: Layers, color: "#C8A2C8", unlocked: true },
  { id: 3, title: "PHASE 03: REACT COMPONENT MATRIX & DYNAMIC PROG", subtitle: "Vite, Component State, Tailwind & DP Algorithms", icon: Code2, color: "#90EE90", unlocked: true },
  { id: 4, title: "PHASE 04: COMPLEX ARCHITECTURE, TREES & HEAPS", subtitle: "Context API, Redux, Binary Trees, BST & Heaps", icon: Target, color: "#AFEEEE", unlocked: true },
  { id: 5, title: "PHASE 05: BACKEND NETWORK & GRAPH ALGORITHMS", subtitle: "Node.js, Express REST APIs, MongoDB & Graph Traversals", icon: Activity, color: "#FF8C69", unlocked: true },
  { id: 6, title: "PHASE 06: FULL-STACK CAPSTONE & FAANG INTERVIEWS", subtitle: "JWT Security, Deployment & Mock Interview Prep", icon: Award, color: "#FFD700", unlocked: true },
];

const MASTER_CURRICULUM: Omit<Mission, "id" | "completed">[] = [
  { phaseId: 1, track: "MERN", module: "JavaScript Core", title: "Object Engine & Property Memory", description: "Deep dive into JS object internal representation, property descriptors, and memory sealing.", duration: "1.5 Hours", difficulty: "INTERMEDIATE", xp: 120, prerequisites: "JS Functions & Closures", objectives: ["Master Object.keys, values, and entries methods", "Understand Object.freeze vs Object.seal memory locking"], practiceProblems: ["Implement custom deep freeze utility"] },
  { phaseId: 1, track: "JAVA_DSA", module: "Core Java & DSA", title: "Advanced Lambdas & Thread Lifecycles", description: "Multi-threaded synchronization and custom functional interfaces in Java.", duration: "2.0 Hours", difficulty: "ADVANCED", xp: 150, prerequisites: "Core Java OOP Pillars", objectives: ["Implement custom functional interfaces using @FunctionalInterface", "Understand thread synchronization locks & file I/O"], practiceProblems: ["Build multi-threaded producer-consumer model"] },
  { phaseId: 1, track: "MERN", module: "JavaScript DOM", title: "DOM Tree Selection & Dynamic Nodes", description: "Manipulating document nodes, dynamic HTML generation, and event listeners.", duration: "1.5 Hours", difficulty: "FOUNDATIONAL", xp: 100, prerequisites: "HTML & CSS Grid", objectives: ["Select & traverse DOM nodes using querySelectorAll", "Implement dynamic element creation with document.createElement"], practiceProblems: ["Build dynamic task card generator"], isCurrent: true },
  { phaseId: 1, track: "JAVA_DSA", module: "DSA Linked List", title: "Singly & Doubly Linked List Operations", description: "Memory pointers, node creation, and CRUD operations on custom Linked Lists.", duration: "2.5 Hours", difficulty: "ADVANCED", xp: 180, prerequisites: "Java References & Memory", objectives: ["Implement custom SinglyLinkedList class with insert/delete", "Solve LC-237 (Delete Node) and LC-876 (Middle Node)"], practiceProblems: ["LeetCode 237", "LeetCode 141", "LeetCode 206"] },
  { phaseId: 2, track: "MERN", module: "Asynchronous JS", title: "Promise Lifecycle & Async/Await", description: "Resolving asynchronous control flow, microtask queue, and Promise API methods.", duration: "2.0 Hours", difficulty: "ADVANCED", xp: 160, prerequisites: "JS Callbacks", objectives: ["Understand microtask vs macrotask queue order", "Master Promise.all, Promise.allSettled, and race"], practiceProblems: ["Implement custom promise retry wrapper"] },
  { phaseId: 2, track: "JAVA_DSA", module: "DSA Stacks & Queues", title: "Monotonic Stack & Min/Max Design", description: "Designing constant time Min-Stack and solving Next Greater Element queries.", duration: "2.0 Hours", difficulty: "ELITE", xp: 200, prerequisites: "Array & LL CRUD", objectives: ["Design MinStack (LC-155) in O(1) time and space", "Solve Next Greater Element I & II using monotonic stack"], practiceProblems: ["LeetCode 155", "LeetCode 496", "LeetCode 20"] },
  { phaseId: 3, track: "MERN", module: "React Architecture", title: "Component State Engine & Virtual DOM", description: "Building reactive UIs using Vite, JSX, and component state hooks.", duration: "2.0 Hours", difficulty: "INTERMEDIATE", xp: 150, prerequisites: "JS ES6 Modules", objectives: ["Understand Virtual DOM reconciliation", "Master useState hook and functional component updates"], practiceProblems: ["Build dynamic counter app with state history rollback"] },
  { phaseId: 3, track: "JAVA_DSA", module: "DSA Dynamic Prog", title: "1D Dynamic Programming Foundations", description: "Converting exponential recursive solutions into linear DP using memoization & tabulation.", duration: "3.0 Hours", difficulty: "ELITE", xp: 250, prerequisites: "Recursion Foundations", objectives: ["Solve Climbing Stairs (LC-70) with O(1) space", "Master House Robber (LC-198) memoization pattern"], practiceProblems: ["LeetCode 70", "LeetCode 198", "LeetCode 322"] },
];

interface SigmaChapter { id: string; name: string; overview: string; }
interface SigmaCategory { id: string; name: string; chapters: SigmaChapter[]; }
interface SigmaTrack { id: string; label: string; color: string; categories: SigmaCategory[]; }

interface SigmaCurriculum { id: string; label: string; subtitle: string; color: string; tracks: SigmaTrack[]; }

const CT_JAVA_TRACKS: SigmaTrack[] = [
  {
    id: "ctj-core", label: "Core Java", color: "#87CEEB",
    categories: [
      { id: "ctj-c1", name: "Java Intro, Syntax, Output, Comments", chapters: [
        { id: "ctj-c1-1", name: "Java Intro & Syntax (2 days)", overview: "Getting started, printing with println and \\n, escape sequences. Practice: Create public class, print Hello, use println and escape sequences." },
      ]},
      { id: "ctj-c2", name: "Variables, Datatypes, Type Casting", chapters: [
        { id: "ctj-c2-1", name: "Variables & Datatypes (3 days)", overview: "Variables, naming, final, primitive vs reference types, casting. Practice: final keyword, valid identifiers, widening vs narrowing casts." },
      ]},
      { id: "ctj-c3", name: "Operators (Complete)", chapters: [
        { id: "ctj-c3-1", name: "Operators (4 days)", overview: "Arithmetic, assignment, unary (inc/dec), relational, logical, ternary, bitwise. Practice: Percentage, area of 5 shapes, swap numbers, even/odd, reverse number, leap year, Armstrong, palindrome." },
      ]},
      { id: "ctj-c4", name: "String, Math, Boolean", chapters: [
        { id: "ctj-c4-1", name: "String, Math, Boolean (3 days)", overview: "Strings: == vs .equals, String Pool, StringBuffer vs StringBuilder, common methods. Math: Heron's formula, quadratic roots." },
      ]},
      { id: "ctj-c5", name: "Conditionals", chapters: [
        { id: "ctj-c5-1", name: "If–Else (2 days)", overview: "Practice: circle area if radius > 0, grading, vowel check, toggle case, leap year." },
        { id: "ctj-c5-2", name: "Switch (2 days)", overview: "Practice: menu-driven calculator, multi-operation menu, weekday by number." },
      ]},
      { id: "ctj-c6", name: "Loops", chapters: [
        { id: "ctj-c6-1", name: "While Loop (2 days)", overview: "While loop fundamentals and practice problems." },
        { id: "ctj-c6-2", name: "For Loop, Break, Continue (2 days)", overview: "For loop fundamentals, break and continue control flow." },
        { id: "ctj-c6-3", name: "Loop Practice Fundamentals (2 days)", overview: "1 to 10, sum N, product N, multiplication table, factorial, prime check, reverse number, Armstrong, palindrome, Nth Fibonacci." },
        { id: "ctj-c6-4", name: "Pattern Printing (2 days)", overview: "Classic patterns with text, numbers, and stars including pyramids, inverted triangles, diamonds. Derive loops using rows, columns, and spaces counters." },
      ]},
      { id: "ctj-c7", name: "Arrays & Methods", chapters: [
        { id: "ctj-c7-1", name: "Arrays (2 days)", overview: "1D and 2D arrays, traversal, aggregation, matrix operations. Practice: input/print, sum, element-wise add, 2D print, add two matrices, diagonals, transpose, multiplication." },
        { id: "ctj-c7-2", name: "Methods (1 day)", overview: "Defining and invoking methods, parameters, return values, overloading." },
        { id: "ctj-c7-3", name: "Recursion Basics (1 day)", overview: "Sum of N, range sum, factorial, Fibonacci." },
      ]},
      { id: "ctj-c8", name: "OOP & Advanced Java", chapters: [
        { id: "ctj-c8-1", name: "OOP: Classes, Objects, Pillars (6 days)", overview: "Encapsulation, inheritance, polymorphism, abstraction. Constructors, this, super, access modifiers, static, final. Interview-style OOP questions." },
        { id: "ctj-c8-2", name: "Interface & Inner Classes (1 day)", overview: "Interfaces, default/static methods, multiple inheritance via interfaces, inner/nested classes." },
        { id: "ctj-c8-3", name: "Lambdas & Exceptions (1 day)", overview: "Lambda basics, functional interfaces, try-catch, custom exceptions." },
        { id: "ctj-c8-4", name: "Threads & File Handling (1 day)", overview: "Thread lifecycle, synchronization concepts, basic file I/O." },
      ]},
    ],
  },
  {
    id: "ctj-dsa", label: "DSA Track", color: "#C8A2C8",
    categories: [
      { id: "ctj-dsa-arr", name: "Arrays (15 days)", chapters: [
        { id: "ctj-arr-1", name: "1D Arrays: Basics & Classic Problems", overview: "Largest element, second/third largest, reverse array (2 methods). LC-1752, LC-26, LC-283, LC-189, LC-485, LC-268, LC-136." },
        { id: "ctj-arr-2", name: "Array Techniques", overview: "LC-121, LC-75 (Dutch National Flag), LC-53 (Kadane's), LC-48, LC-54, LC-1, LC-88 (Merge sorted), LC-169, LC-73, LC-560." },
        { id: "ctj-arr-3", name: "Hashing & Set Operations", overview: "Set union and intersection [GFG], LC-229. HashMap/HashSet introduction." },
        { id: "ctj-arr-4", name: "Binary Search", overview: "Upper bound [GFG], lower bound [GFG], rotated array [GFG]. LC-704, LC-33, LC-34, LC-81, LC-162, LC-540, LC-35." },
        { id: "ctj-arr-5", name: "Sliding Window", overview: "LC-3, LC-1004, Fruits into Baskets [GFG], plus the 4 standard sliding window variations." },
        { id: "ctj-arr-6", name: "Sorting Practice", overview: "Bubble sort, selection sort, insertion sort — implementation and analysis." },
      ]},
      { id: "ctj-dsa-str", name: "Strings (10 days)", chapters: [
        { id: "ctj-str-1", name: "String Problems", overview: "Core string concepts. LC-28, LC-796, LC-1903, LC-242, LC-14, LC-151, LC-1021, LC-451." },
      ]},
      { id: "ctj-dsa-ll", name: "Linked List (7 days)", chapters: [
        { id: "ctj-ll-1", name: "Concepts & Custom Implementation", overview: "Linked list concepts, node structure, custom implementation." },
        { id: "ctj-ll-2", name: "CRUD Operations", overview: "Insert, delete, update, traverse operations." },
        { id: "ctj-ll-3", name: "Linked List Problems", overview: "LC-237, LC-234, LC-141, LC-876, LC-142, LC-2, LC-160, LC-2095, LC-206, LC-148, LC-61, LC-19." },
      ]},
      { id: "ctj-dsa-sq", name: "Stack and Queue (15 days)", chapters: [
        { id: "ctj-sq-1", name: "Implementations & Operations", overview: "Stack and queue implementations using arrays and linked lists, operations." },
        { id: "ctj-sq-2", name: "Prefix, Infix, Postfix", overview: "Conversion between prefix, infix, and postfix expressions." },
        { id: "ctj-sq-3", name: "Min/Max Stack Problems", overview: "LC-20, LC-735, LC-496, LC-402, Next smaller/greater element, LC-503, LC-155, LC-239, LC-42." },
      ]},
      { id: "ctj-dsa-rec", name: "Recursion (7 days)", chapters: [
        { id: "ctj-rec-1", name: "Foundational Recursion", overview: "10–15 foundational recursion problems." },
        { id: "ctj-rec-2", name: "Sorting & Problems", overview: "Merge sort, quick sort, and related questions. LC-8, LC-50, LC-1922, LC-39, LC-40, Subset Sum [GFG], permutations." },
      ]},
      { id: "ctj-dsa-bt", name: "Backtracking (7 days)", chapters: [
        { id: "ctj-bt-1", name: "Backtracking Problems", overview: "Introduction and patterns. N-Queens (LC-51), Rat in a Maze [GFG], LC-22, LC-78, LC-90, M-Coloring, Sudoku." },
      ]},
      { id: "ctj-dsa-dp", name: "Dynamic Programming (15 days)", chapters: [
        { id: "ctj-dp-1", name: "DP Foundations", overview: "Memoization, tabulation, space optimization." },
        { id: "ctj-dp-2", name: "DP Problems", overview: "LC-70, Frog Jump [GFG], subsequences, LC-198, LC-322, cut into segments, Ninja and the Fence, LC-62, LC-64, LC-377, LC-39, LC-40, LC-216, LC-300, LC-1143, LC-1027, LC-516, MCM." },
      ]},
      { id: "ctj-dsa-trees", name: "Trees (7 days)", chapters: [
        { id: "ctj-trees-1", name: "Tree Fundamentals", overview: "Intro, types, binary trees, traversals. LC-144, LC-94, LC-145, LC-102, LC-100, LC-101, LC-110, LC-111, LC-543. Depth and diameter [GFG]." },
      ]},
      { id: "ctj-dsa-heap", name: "Heaps / Priority Queue (5 days)", chapters: [
        { id: "ctj-heap-1", name: "Heap Operations & Sort", overview: "Intro, heap operations, heap sort. Priority Queue practice on LeetCode." },
      ]},
      { id: "ctj-dsa-bst", name: "BST (5 days)", chapters: [
        { id: "ctj-bst-1", name: "BST Problems", overview: "Intro, implementation, properties. LC-98, LC-96, LC-230, LC-700, LC-501, LC-235." },
      ]},
      { id: "ctj-dsa-graph", name: "Graph (10 days)", chapters: [
        { id: "ctj-graph-1", name: "Graph Fundamentals & BFS", overview: "Intro, types, traversals. LC-1971, LC-997, LC-841. BFS: LC-200, LC-785." },
        { id: "ctj-graph-2", name: "DFS & Grid Problems", overview: "DFS core: LC-695, LC-733, LC-130. Grid/matrix problems: LC-994, LC-542, LC-1091." },
        { id: "ctj-graph-3", name: "Advanced Graph", overview: "Cycle detection & bipartite LC-207, Topological sort (Khan's algo) LC-210, Shortest path LC-787/LC-743, MST, Union Find LC-547/LC-684." },
      ]},
    ],
  },
];

const CT_MERN_TRACKS: SigmaTrack[] = [
  {
    id: "ctm-html", label: "HTML", color: "#FFB6C1",
    categories: [
      { id: "ctm-html-1", name: "HTML Fundamentals", chapters: [
        { id: "ctm-h1", name: "Day 1 · Intro to Web & HTML", overview: "Web basics, client–server, HTML document structure." },
        { id: "ctm-h2", name: "Day 2 · Basic Tags", overview: "Headings, paragraphs, images, text formatting, inline vs block." },
        { id: "ctm-h3", name: "Day 3 · Hyperlinks & Lists", overview: "Anchor tags, ordered and unordered lists, nested lists, link states." },
        { id: "ctm-h4", name: "Day 4 · Tables", overview: "Structure, rowspan, colspan." },
        { id: "ctm-h5", name: "Day 5 · Forms I", overview: "Inputs, labels, textarea, select, fieldset, legend." },
        { id: "ctm-h6", name: "Day 6 · Forms II & Multimedia", overview: "Fieldset and legend, audio, video, iframe." },
        { id: "ctm-h7", name: "Day 7 · Semantic HTML", overview: "header, nav, section, article, footer, div, span." },
        { id: "ctm-h8", name: "Day 8 · SEO Basics", overview: "Meta tags, favicon, accessibility basics." },
        { id: "ctm-h9", name: "Day 9 · Mini Project", overview: "Personal info page." },
      ]},
    ],
  },
  {
    id: "ctm-css", label: "CSS", color: "#C8A2C8",
    categories: [
      { id: "ctm-css-1", name: "CSS Core", chapters: [
        { id: "ctm-c10", name: "Day 10 · Intro to CSS", overview: "Syntax, selectors, inline vs internal vs external CSS." },
        { id: "ctm-c11", name: "Day 11 · Core Properties", overview: "Colors, backgrounds, specificity." },
        { id: "ctm-c12", name: "Day 12 · Backgrounds", overview: "Images and gradients: linear, radial, conic." },
        { id: "ctm-c13", name: "Day 13 · Text & Fonts", overview: "Families, sizing, line height." },
        { id: "ctm-c14", name: "Day 14 · Box Model", overview: "Padding, margin, border." },
        { id: "ctm-c15", name: "Day 15 · Styling Links, Lists, Tables", overview: "Practical patterns." },
        { id: "ctm-c16", name: "Day 16 · Display", overview: "inline, block, inline-block, none, visibility." },
        { id: "ctm-c17", name: "Day 17 · Position", overview: "static, relative, absolute, fixed, sticky." },
        { id: "ctm-c18", name: "Day 18 · Float, Overflow, Z-index", overview: "Layout control techniques." },
      ]},
      { id: "ctm-css-2", name: "CSS Layout & Animation", chapters: [
        { id: "ctm-c19", name: "Day 19 · Transitions & Transform", overview: "duration, delay, timing, translate, rotate, scale, skew, matrix." },
        { id: "ctm-c20", name: "Day 20 · Flexbox I", overview: "Container, direction, justify, align, wrap, gap, grow, shrink, basis." },
        { id: "ctm-c21", name: "Day 21 · Flexbox II", overview: "Real-world flexbox patterns." },
        { id: "ctm-c22", name: "Day 22 · Animations", overview: "@keyframes, animation properties." },
        { id: "ctm-c23", name: "Day 23 · CSS Grid I", overview: "Template rows/columns, gap, grid-row/column, area, place-items." },
        { id: "ctm-c24", name: "Day 24 · CSS Grid II", overview: "Layout compositions." },
        { id: "ctm-c25", name: "Day 25 · Media Queries", overview: "max-width, min-width, orientation, responsive design." },
        { id: "ctm-c26", name: "Day 26 · Mini Project + Review", overview: "Portfolio layout." },
      ]},
    ],
  },
  {
    id: "ctm-js", label: "JavaScript", color: "#90EE90",
    categories: [
      { id: "ctm-js-1", name: "JS Fundamentals", chapters: [
        { id: "ctm-js29", name: "Day 29 · JS Intro", overview: "Script loading, variables, console, alert, prompt." },
        { id: "ctm-js30", name: "Day 30 · Datatypes & Operators", overview: "Primitives, objects, arithmetic, comparison, logical, ternary." },
        { id: "ctm-js31", name: "Day 31 · Conditionals", overview: "if, else, switch." },
        { id: "ctm-js32", name: "Day 32 · Loops", overview: "for, while, do-while." },
        { id: "ctm-js33", name: "Day 33 · Functions", overview: "Declarations, expressions, params, returns, arrow functions." },
        { id: "ctm-js34", name: "Day 34 · Arrays & Methods", overview: "push, pop, shift, unshift, splice, slice, concat, forEach, map, filter, reduce." },
        { id: "ctm-js36", name: "Day 36 · Objects & Methods", overview: "keys, values, entries, assign, hasOwnProperty, freeze, seal." },
        { id: "ctm-js37", name: "Day 37 · String & Math", overview: "Common utilities, randoms." },
        { id: "ctm-js38", name: "Day 38 · Date & Time", overview: "Create and manipulate dates." },
      ]},
      { id: "ctm-js-2", name: "DOM & Events", chapters: [
        { id: "ctm-js39", name: "Day 39 · DOM Intro", overview: "Selecting and reading elements." },
        { id: "ctm-js40", name: "Day 40 · DOM Manipulation", overview: "Change content, styles, attributes." },
        { id: "ctm-js41", name: "Day 41 · Events", overview: "Event listeners and handlers." },
        { id: "ctm-js42", name: "Day 42 · Mini Project", overview: "Basic calculator." },
        { id: "ctm-js43", name: "Day 43 · Form Handling I", overview: "Validations with RegEx." },
        { id: "ctm-js44", name: "Day 44 · Form Handling II", overview: "Advanced form patterns." },
      ]},
      { id: "ctm-js-3", name: "Advanced JS", chapters: [
        { id: "ctm-js45", name: "Day 45 · Execution & Hoisting", overview: "Phases, contexts, call stack, hoisting." },
        { id: "ctm-js46", name: "Day 46 · let/const & Scope", overview: "TDZ, block vs function vs global." },
        { id: "ctm-js47", name: "Day 47 · Closures", overview: "Scope chains, closure uses." },
        { id: "ctm-js48", name: "Day 48 · Higher-Order Functions", overview: "map, filter, reduce deep dive." },
        { id: "ctm-js49", name: "Day 49 · Timers & Callbacks", overview: "setTimeout, setInterval, callback patterns." },
        { id: "ctm-js50", name: "Day 50 · Callback Hell, Sync vs Async", overview: "Control-flow strategies." },
        { id: "ctm-js51", name: "Day 51 · Promises", overview: "States, chaining." },
        { id: "ctm-js52", name: "Day 52 · Promise API", overview: "all, race, allSettled, any." },
        { id: "ctm-js53", name: "Day 53 · async/await & fetch", overview: "Async API calls." },
        { id: "ctm-js54", name: "Day 54 · Error Handling & JSON", overview: "try…catch, JSON.parse/stringify." },
        { id: "ctm-js55", name: "Day 55 · Mini Project", overview: "Fetch with async/await." },
        { id: "ctm-js56", name: "Day 56 · Storage APIs", overview: "localStorage, sessionStorage CRUD." },
        { id: "ctm-js57", name: "Day 57-58 · Review & Major Project", overview: "Review & test, then build JS major project." },
      ]},
    ],
  },
  {
    id: "ctm-tw", label: "Tailwind CSS", color: "#AFEEEE",
    categories: [
      { id: "ctm-tw-1", name: "Tailwind CSS", chapters: [
        { id: "ctm-tw61", name: "Day 61 · Setup & Utilities", overview: "CDN/CLI, colors, spacing, typography." },
        { id: "ctm-tw62", name: "Day 62 · Layout Utilities", overview: "Flex, grid, container." },
        { id: "ctm-tw63", name: "Day 63 · Components & Responsive Design", overview: "Navbar, cards, buttons, shadows, hover, borders, breakpoints." },
      ]},
    ],
  },
  {
    id: "ctm-react", label: "React.js", color: "#87CEEB",
    categories: [
      { id: "ctm-react-1", name: "React Fundamentals", chapters: [
        { id: "ctm-r64", name: "Day 64 · React Intro", overview: "Vite setup." },
        { id: "ctm-r65", name: "Day 65 · Components", overview: "Functional vs class." },
        { id: "ctm-r66", name: "Day 66 · JSX", overview: "Card component." },
        { id: "ctm-r67", name: "Day 67 · Styling", overview: "CSS, Tailwind, inline." },
        { id: "ctm-r68", name: "Day 68 · Props", overview: "Passing data between components." },
        { id: "ctm-r69", name: "Day 69 · State (useState)", overview: "Managing component state." },
        { id: "ctm-r70", name: "Day 70 · Event Handling", overview: "onClick, onChange." },
        { id: "ctm-r71", name: "Day 71 · Mini Project", overview: "Build a mini React project." },
      ]},
      { id: "ctm-react-2", name: "React Intermediate", chapters: [
        { id: "ctm-r72", name: "Day 72 · Conditional Rendering", overview: "Ternary, short-circuit." },
        { id: "ctm-r73", name: "Day 73 · Lists & Keys", overview: "map in JSX." },
        { id: "ctm-r74", name: "Day 74 · Forms I", overview: "Controlled components." },
        { id: "ctm-r75", name: "Day 75 · Forms II", overview: "Validation and handling." },
        { id: "ctm-r76", name: "Day 76 · Lifting State Up", overview: "Sharing state between components." },
        { id: "ctm-r77", name: "Days 77–79 · Class Components", overview: "Lifecycle: mount, update, unmount." },
        { id: "ctm-r80", name: "Day 80 · useEffect", overview: "Side effects, API calls." },
        { id: "ctm-r81", name: "Day 81 · Fetch API in React", overview: "Fetching data in React components." },
        { id: "ctm-r82", name: "Day 82 · Mini Project", overview: "Build a mini React project." },
      ]},
      { id: "ctm-react-3", name: "React Advanced", chapters: [
        { id: "ctm-r83", name: "Days 83–84 · Routing", overview: "Basic and nested routes, Outlet, useNavigate." },
        { id: "ctm-r85", name: "Day 85 · Axios Mini Project", overview: "API calls using Axios." },
        { id: "ctm-r86", name: "Day 86 · Context API", overview: "Avoid prop drilling." },
        { id: "ctm-r87", name: "Day 87 · CRUD Project", overview: "Local storage or API." },
        { id: "ctm-r90", name: "Day 90 · Redux Intro", overview: "Reducers, actions, store." },
        { id: "ctm-r93", name: "Day 93 · React Major Project", overview: "Build a full React major project." },
      ]},
    ],
  },
  {
    id: "ctm-node", label: "Node.js", color: "#FFD700",
    categories: [
      { id: "ctm-node-1", name: "Node.js Fundamentals", chapters: [
        { id: "ctm-n97", name: "Day 97 · Node Intro", overview: "Setup, npm." },
        { id: "ctm-n98", name: "Day 98 · Modules", overview: "CommonJS vs ES Modules." },
        { id: "ctm-n99", name: "Day 99 · Files & Paths", overview: "fs, path." },
        { id: "ctm-n100", name: "Day 100 · http", overview: "Create a server." },
        { id: "ctm-n101", name: "Day 101 · Event Loop", overview: "Async concepts." },
      ]},
    ],
  },
  {
    id: "ctm-express", label: "Express.js & MongoDB", color: "#FF8C69",
    categories: [
      { id: "ctm-exp-1", name: "Express.js", chapters: [
        { id: "ctm-e102", name: "Day 102 · Express Intro", overview: "Server, routes." },
        { id: "ctm-e103", name: "Day 103 · Middleware", overview: "Built-in, custom." },
        { id: "ctm-e104", name: "Day 104 · REST API", overview: "GET, POST, PUT, DELETE." },
        { id: "ctm-e105", name: "Day 105 · Params & Query", overview: "URL parameters." },
        { id: "ctm-e106", name: "Day 106 · Postman", overview: "API testing." },
        { id: "ctm-e107", name: "Day 107 · Error Handling", overview: "Custom middleware." },
      ]},
      { id: "ctm-exp-2", name: "MongoDB & Mongoose", chapters: [
        { id: "ctm-e108", name: "Day 108 · MongoDB Intro", overview: "Compass, CRUD basics." },
        { id: "ctm-e109", name: "Day 109 · Mongoose Setup", overview: "Connect Node to MongoDB." },
        { id: "ctm-e110", name: "Day 110 · Schema & Models", overview: "Define collections." },
        { id: "ctm-e111", name: "Day 111 · MVC Pattern", overview: "Model, View, Controller." },
        { id: "ctm-e112", name: "Day 112 · CRUD with Mongoose", overview: "Full CRUD using Mongoose." },
        { id: "ctm-e113", name: "Day 113 · Express + Mongo Integration", overview: "Connecting Express with MongoDB." },
        { id: "ctm-e114", name: "Day 114 · Validation", overview: "Mongoose validation." },
      ]},
      { id: "ctm-exp-3", name: "Auth & Deployment", chapters: [
        { id: "ctm-e115", name: "Day 115 · Authentication Intro", overview: "JWT, bcrypt." },
        { id: "ctm-e116", name: "Day 116 · Signup & Login API", overview: "Build auth endpoints." },
        { id: "ctm-e117", name: "Day 117 · Authorization", overview: "Protect routes." },
        { id: "ctm-e118", name: "Day 118 · Environment Variables", overview: "dotenv." },
        { id: "ctm-e119", name: "Day 119 · File Uploads", overview: "Multer." },
        { id: "ctm-e120", name: "Day 120 · Mini Backend Project", overview: "Blog or Bookstore API." },
        { id: "ctm-e122", name: "Day 122 · Testing & Debugging", overview: "Postman and error fixes." },
      ]},
    ],
  },
  {
    id: "ctm-mern", label: "MERN Integration", color: "#98FB98",
    categories: [
      { id: "ctm-mern-1", name: "Full-Stack Integration & Deployment", chapters: [
        { id: "ctm-m124", name: "Day 124 · Project Intro", overview: "Folder structure." },
        { id: "ctm-m125", name: "Day 125 · Frontend ↔ Backend Connect", overview: "Axios + proxy." },
        { id: "ctm-m126", name: "Day 126 · CRUD Integration", overview: "Full CRUD across frontend and backend." },
        { id: "ctm-m127", name: "Day 127 · React Authentication", overview: "JWT + Context." },
        { id: "ctm-m128", name: "Day 128 · Protected Routes", overview: "Protecting frontend routes." },
        { id: "ctm-m129", name: "Day 129 · Profile & Dashboard", overview: "User profile and dashboard pages." },
        { id: "ctm-m130", name: "Day 130 · Project Styling", overview: "Tailwind UI polish." },
        { id: "ctm-m131", name: "Day 131 · Testing & Debugging", overview: "End-to-end checks." },
        { id: "ctm-m132", name: "Day 132 · Deployment", overview: "Production steps." },
      ]},
    ],
  },
];

const SIGMA9_TRACKS: SigmaTrack[] = [
  {
    id: "dsa", label: "DSA (Java/C++)", color: "#C8A2C8",
    categories: [
      { id: "dsa-basics", name: "Basics of Programming", chapters: [
        { id: "dsa-b1", name: "Flowcharts & Pseudocodes", overview: "What are flowcharts, pseudocodes, decision making using flowcharts, examples" },
        { id: "dsa-b2", name: "Variables & Data Types", overview: "First Java program, variables and data types, taking input/output, how Java code runs" },
        { id: "dsa-b3", name: "Conditional Statements", overview: "Introduction to if/else, else-if, nested conditionals, switch" },
        { id: "dsa-b4", name: "Operators", overview: "Arithmetic, relational, logical & assignment operators" },
      ]},
      { id: "dsa-loops", name: "Loops & Functions", chapters: [
        { id: "dsa-l1", name: "For / While / Do-while Loops", overview: "Flow of execution, break & continue, examples" },
        { id: "dsa-l2", name: "Patterns", overview: "Introduction to nested loops, basic to advanced patterns (butterfly, Floyd's triangle, rhombus etc.)" },
        { id: "dsa-l3", name: "Functions", overview: "Introduction to functions, function calling, pass by value, scope" },
      ]},
      { id: "dsa-arrays", name: "Arrays", chapters: [
        { id: "dsa-a1", name: "Introduction to Arrays", overview: "Arrays in memory, passing arrays to functions, interview problems" },
        { id: "dsa-a2", name: "Searching & Sorting", overview: "Linear search, binary search, selection sort, bubble sort, insertion sort, count sort" },
      ]},
      { id: "dsa-2d", name: "2D Arrays & Strings", chapters: [
        { id: "dsa-2d1", name: "2D Arrays", overview: "2D arrays in memory, examples using 2D arrays" },
        { id: "dsa-2d2", name: "Strings", overview: "Introduction to strings & StringBuilder, storage of strings and inbuilt functions" },
      ]},
      { id: "dsa-pst", name: "Problem Solving Techniques", chapters: [
        { id: "dsa-p1", name: "Recursion, Backtracking & Divide and Conquer", overview: "Principle of mathematical induction, factorial, Fibonacci, recursion on arrays/strings/2D arrays, backtrack, merge sort, quick sort" },
        { id: "dsa-p2", name: "Bit Manipulation", overview: "Binary number system, bitwise operators, operations on bits, fast exponentiation" },
        { id: "dsa-p3", name: "Time & Space Complexity", overview: "Order complexity analysis, theoretical and practical analysis, time complexity of searching & recursive algorithms, space complexity of merge sort" },
        { id: "dsa-p4", name: "Greedy Algorithms", overview: "Introduction to greedy approach, solving classical greedy problems" },
      ]},
      { id: "dsa-oop", name: "Object-Oriented Programming", chapters: [
        { id: "dsa-o1", name: "Basic to Advanced OOP", overview: "Objects & classes, getters/setters, constructors, static members, function overloading, abstraction, encapsulation, inheritance, polymorphism, abstract classes, interfaces" },
      ]},
      { id: "dsa-linear", name: "Linear Data Structures", chapters: [
        { id: "dsa-li1", name: "ArrayLists / Vectors", overview: "Introduction to Java collections / STL in C++, solved questions" },
        { id: "dsa-li2", name: "Linked Lists", overview: "Introduction, inserting/deleting nodes, midpoint, merge two sorted LLs, merge sort of LL, reversing a linked list" },
        { id: "dsa-li3", name: "Stacks and Queues", overview: "Stacks & queues using arrays and linked lists, dynamic classes, inbuilt stack, circular queue" },
      ]},
      { id: "dsa-trees", name: "Trees", chapters: [
        { id: "dsa-t1", name: "Binary Trees & BST", overview: "Constructing trees, traversals, diameter, height & LCA, BST searching, BST class, inserting/deleting in BST, types of balanced BSTs" },
      ]},
      { id: "dsa-adv", name: "Advanced Data Structures", chapters: [
        { id: "dsa-adv1", name: "Heaps / Priority Queues", overview: "Min/max heaps, heap sort, CBTs, insert/delete in heaps, implementing priority queues, inbuilt priority queue" },
        { id: "dsa-adv2", name: "Hashing (Maps & Sets)", overview: "Hashmaps, inbuilt hashmap/hashset, hash functions, insert/delete implementation, examples" },
        { id: "dsa-adv3", name: "Tries", overview: "Trie node class, insert/search/remove operations, types of tries, questions on tries" },
        { id: "dsa-adv4", name: "Graphs", overview: "Graph terminology, implementation, DFS & BFS, weighted & directed graphs, MST, cycle detection, Kruskal's, Prim's, Dijkstra's, Bellman-Ford, lots of questions" },
        { id: "dsa-adv5", name: "Segment Trees", overview: "What are segment trees, creation, solving range queries" },
      ]},
      { id: "dsa-dp", name: "Dynamic Programming", chapters: [
        { id: "dsa-dp1", name: "DP & its Questions", overview: "Fundamentals of DP, memoization, knapsack, Fibonacci with recursion/memo/tabulation, LCS, Catalan's number, edit distance, matrix chain multiplication and much more" },
      ]},
    ],
  },
  {
    id: "frontend", label: "Frontend (HTML/CSS/JS)", color: "#90EE90",
    categories: [
      { id: "fe-intro", name: "Introduction to Web", chapters: [
        { id: "fe-i1", name: "What is Web?", overview: "Understanding how and who built the web" },
        { id: "fe-i2", name: "Client-Server Architecture", overview: "General architecture used by websites; requests & responses" },
        { id: "fe-i3", name: "Setting Developer Environment", overview: "Setting up our environment on laptop/computer where we'll do coding" },
      ]},
      { id: "fe-html", name: "HTML", chapters: [
        { id: "fe-h1", name: "Structure", overview: "How to create the structure of a web page" },
        { id: "fe-h2", name: "Tags in HTML", overview: "Various tags like <h1>, <p>, <a>, <img> etc." },
        { id: "fe-h3", name: "Block vs Inline", overview: "Difference between inline and block HTML elements" },
        { id: "fe-h4", name: "Tables", overview: "Learn to create tables in HTML" },
        { id: "fe-h5", name: "Forms", overview: "Learn about forms and form fields" },
      ]},
      { id: "fe-css", name: "CSS Fundamentals", chapters: [
        { id: "fe-c1", name: "Intro to CSS", overview: "What is CSS & how to use it in HTML, different styles of writing" },
        { id: "fe-c2", name: "Understanding Selectors", overview: "Element, class & id selectors, combinators, pseudo classes, pseudo elements, specificity in CSS" },
        { id: "fe-c3", name: "Selector Specificity", overview: "Understanding the specificity & priority of CSS selectors" },
        { id: "fe-c4", name: "Box Model", overview: "Understanding the CSS box model" },
        { id: "fe-c5", name: "CSS Units", overview: "Various CSS units, absolute & relative" },
        { id: "fe-c6", name: "CSS Transitions", overview: "Understanding element transitions in CSS along with shorthand" },
        { id: "fe-c7", name: "CSS Transforms", overview: "Understanding element transformations in CSS along with shorthand" },
      ]},
      { id: "fe-layout", name: "Layout & Responsive", chapters: [
        { id: "fe-l1", name: "Flexbox: Intro to Flex", overview: "Understanding flexbox layout, cross axis, main axis etc." },
        { id: "fe-l2", name: "Flexbox: Flex Properties", overview: "Direction, justify-content, align-items, align-self, flex-wrap, flex sizing" },
        { id: "fe-l3", name: "Media Queries", overview: "Learn about media queries & viewport for responsive designs" },
      ]},
      { id: "fe-frameworks", name: "Frontend Frameworks", chapters: [
        { id: "fe-f1", name: "Bootstrap: Components", overview: "Using various bootstrap elements like Navbar, buttons, cards etc." },
        { id: "fe-f2", name: "Bootstrap: Grid System", overview: "Learning about grid system of Bootstrap" },
        { id: "fe-f3", name: "Tailwind CSS: Basics", overview: "Understanding Tailwind as a framework" },
        { id: "fe-f4", name: "Tailwind CSS: Components", overview: "Covering button, navbar, fonts, margin, padding etc." },
        { id: "fe-f5", name: "Tailwind: Responsive Designs", overview: "Understanding responsiveness in Tailwind, @apply, @layer etc." },
        { id: "fe-f6", name: "CSS Major Project", overview: "Focus on using CSS concepts we have learned to build our project" },
      ]},
      { id: "fe-js", name: "JavaScript Fundamentals", chapters: [
        { id: "fe-js1", name: "Intro to JS", overview: "What is JS and use of JS" },
        { id: "fe-js2", name: "Variables, Operators, Conditionals, Loops", overview: "Learning the basics of the language" },
        { id: "fe-js3", name: "Scope", overview: "Understanding scope in JS" },
        { id: "fe-js4", name: "Functions Expressions vs Declaration", overview: "Difference between function expression and declaration" },
        { id: "fe-js5", name: "Arrays and its usage", overview: "What are arrays and using array functions like splice, slice etc." },
      ]},
      { id: "fe-dom", name: "DOM & Objects", chapters: [
        { id: "fe-d1", name: "Intro to Objects", overview: "What are objects, how to create them and using different notations to access object's data" },
        { id: "fe-d2", name: "Object Functions", overview: "Iterate over objects, delete object properties, creating nested objects" },
        { id: "fe-d3", name: "DOM", overview: "Understanding DOM, what it is, how to access elements from the DOM" },
        { id: "fe-d4", name: "Events", overview: "How to manipulate DOM events in JS" },
      ]},
      { id: "fe-adv", name: "Advanced JS Concepts", chapters: [
        { id: "fe-adv1", name: "IIFE", overview: "What are immediately invoked function expressions" },
        { id: "fe-adv2", name: "Closures", overview: "What are closures and their application" },
        { id: "fe-adv3", name: "Arrow Functions", overview: "Learning about arrow functions and bindings in arrow functions" },
        { id: "fe-adv4", name: '"this" keyword', overview: 'How does the "this" keyword work in JS' },
        { id: "fe-adv5", name: "Prototypes", overview: "What are prototypes in JS, why do we use them and their application" },
        { id: "fe-adv6", name: "Classes", overview: "Using classes in JS and class inheritance" },
      ]},
      { id: "fe-async", name: "Asynchronous JavaScript", chapters: [
        { id: "fe-as1", name: "Promises & Callbacks", overview: "What are promises and callbacks in Javascript, why to use" },
        { id: "fe-as2", name: "Timed Events", overview: "What is setTimeout, event loops in JavaScript" },
        { id: "fe-as3", name: "Async / Await", overview: "What are Async Await in Javascript, why that is important" },
        { id: "fe-as4", name: "Intro to AJAX", overview: "What are async requests, what is API and JSON" },
        { id: "fe-as5", name: "Handling Promises", overview: "What is a promise, how do we use promises and chaining promises" },
      ]},
      { id: "fe-tools", name: "Tooling & Projects", chapters: [
        { id: "fe-t1", name: "Git: Intro & Branches", overview: "What is git and why it's helpful, exploring branches in Git" },
        { id: "fe-t2", name: "Git Workflow", overview: "Understanding push, commits, pull requests and using git for teams" },
        { id: "fe-t3", name: "Mastering Terminal", overview: "Directories, commands, paths, operations on files" },
        { id: "fe-t4", name: "JS Major Project", overview: "Create something classic by using the concepts learned in JS" },
      ]},
    ],
  },
  {
    id: "backend", label: "Backend (Node/Express/MongoDB)", color: "#FFB6C1",
    categories: [
      { id: "be-node", name: "Node.js", chapters: [
        { id: "be-n1", name: "Intro to Node", overview: "Introduction to the course, hello world with Node.js" },
        { id: "be-n2", name: "Setting up & First Server", overview: "Setting up tools, intro to servers, setting up the very first node server, nodemon" },
      ]},
      { id: "be-express", name: "Express & MVC", chapters: [
        { id: "be-e1", name: "MVC Architecture", overview: "MVC architecture for our server" },
        { id: "be-e2", name: "Express Framework", overview: "What are frameworks, using Express with Node" },
        { id: "be-e3", name: "EJS Template Engine", overview: "What are template engines, setting up and working with EJS" },
        { id: "be-e4", name: "Middleware", overview: "What is middleware and how to use one" },
      ]},
      { id: "be-db", name: "Databases", chapters: [
        { id: "be-db1", name: "Intro to Databases & SQL", overview: "What are databases & why we need them, what is SQL, SQL queries etc." },
        { id: "be-db2", name: "MongoDB Setup", overview: "What is MongoDB, how to use it and setting up MongoDB for the project" },
        { id: "be-db3", name: "CRUD with MongoDB", overview: "CRUD operations for MongoDB" },
        { id: "be-db4", name: "Mongoose", overview: "Linking MongoDB using Mongoose" },
      ]},
      { id: "be-proj", name: "Mega Project", chapters: [
        { id: "be-p1", name: "Mega Project", overview: "APIs, error handling, validation, Express router, authentication, deployment & many more concepts" },
      ]},
    ],
  },
  {
    id: "react", label: "React", color: "#87CEEB",
    categories: [
      { id: "re-core", name: "React Fundamentals", chapters: [
        { id: "re-c1", name: "Components, Styling & More", overview: "What is React, installation, react components, styling in React, component lifecycle methods, Material UI etc." },
      ]},
      { id: "re-proj", name: "React Project", chapters: [
        { id: "re-p1", name: "React Based Project", overview: "Using the concepts we have learned to build our project" },
      ]},
    ],
  },
];

const CURRICULA: SigmaCurriculum[] = [
  { id: "sigma9",  label: "Sigma 9",      subtitle: "Apna College",     color: "#C8A2C8", tracks: SIGMA9_TRACKS  },
  { id: "ct-java", label: "Java Roadmap", subtitle: "Coding Thinker",   color: "#87CEEB", tracks: CT_JAVA_TRACKS },
  { id: "ct-mern", label: "MERN Stack",   subtitle: "Coding Thinker",   color: "#90EE90", tracks: CT_MERN_TRACKS },
];

const GLASS_CARD: React.CSSProperties = {
  background: "rgba(18, 18, 28, 0.75)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 16,
};

export default function MissionControlPlanner() {
  const { data: dbTasks = [] } = useListTasks({ status: "all" });
  const { data: userStats } = useGetUserStats();
  const { data: taskSummary } = useGetTaskSummary();
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"MISSION_CONTROL" | "CALENDAR" | "PROBLEMS" | "LEETCODE" | "SIGMA9">("MISSION_CONTROL");
  const [selectedTrack, setSelectedTrack] = useState<"ALL" | "MERN" | "JAVA_DSA">("ALL");
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>("m-3");

  // Sigma 9 / Curricula states
  const [sigma9Progress, setSigma9Progress] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("sigma9-progress") || "{}"); } catch { return {}; }
  });
  const [sigma9CurriculumId, setSigma9CurriculumId] = useState<string>("sigma9");
  const [sigma9Track, setSigma9Track] = useState<string>("dsa");
  const [expandedSigmaCategory, setExpandedSigmaCategory] = useState<string | null>(null);

  const activeCurriculum = CURRICULA.find((c) => c.id === sigma9CurriculumId) ?? CURRICULA[0];

  const toggleSigmaChapter = (chapterId: string) => {
    setSigma9Progress((prev) => {
      const next = { ...prev, [chapterId]: !prev[chapterId] };
      localStorage.setItem("sigma9-progress", JSON.stringify(next));
      return next;
    });
  };

  // Chapter detail drawer
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string; overview: string; trackColor: string } | null>(null);
  const [chapterSolvedProblems, setChapterSolvedProblems] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("chapter-solved-problems") || "{}"); } catch { return {}; }
  });

  const parseLCNumbers = (overview: string): string[] => {
    const matches = overview.match(/LC-(\d+)/g) ?? [];
    return [...new Set(matches.map((m) => m.replace("LC-", "")))];
  };

  const toggleChapterProblemSolved = (num: string) => {
    setChapterSolvedProblems((prev) => {
      const next = { ...prev, [num]: !prev[num] };
      localStorage.setItem("chapter-solved-problems", JSON.stringify(next));
      return next;
    });
  };

  const sigmaAllChapters = activeCurriculum.tracks.flatMap((t) => t.categories.flatMap((c) => c.chapters));
  const sigmaCompletedCount = sigmaAllChapters.filter((ch) => sigma9Progress[ch.id]).length;
  const sigmaProgressPct = sigmaAllChapters.length > 0 ? Math.round((sigmaCompletedCount / sigmaAllChapters.length) * 100) : 0;
  const sigmaActiveTrack = activeCurriculum.tracks.find((t) => t.id === sigma9Track) ?? activeCurriculum.tracks[0];

  // Problems Matrix States
  const [problemPlatformFilter, setProblemPlatformFilter] = useState<string>("all");
  const [problemCategoryFilter, setProblemCategoryFilter] = useState<string>("all");
  const [problemStatusFilter, setProblemStatusFilter] = useState<string>("all");
  const [isAddProblemOpen, setIsAddProblemOpen] = useState(false);
  const [isLinkAccountsOpen, setIsLinkAccountsOpen] = useState(false);

  // New Problem Form
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState<"leetcode" | "gfg">("leetcode");
  const [newDifficulty, setNewDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [newCategory, setNewCategory] = useState<"classwork" | "homework">("homework");

  // Link Accounts Form
  const [lcUsername, setLcUsername] = useState("");
  const [lcApiKey, setLcApiKey] = useState("");
  const [gfgUsername, setGfgUsername] = useState("");
  const [gfgApiKey, setGfgApiKey] = useState("");

  // Fetch Problems API
  const { data: problems = [], refetch: refetchProblems } = useQuery<Problem[]>({
    queryKey: ["/api/problems", problemPlatformFilter, problemCategoryFilter, problemStatusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/problems?platform=${problemPlatformFilter}&category=${problemCategoryFilter}&status=${problemStatusFilter}`);
      return res.json();
    },
  });

  // Fetch Summary API
  const { data: problemSummary, refetch: refetchSummary } = useQuery<ProblemSummary>({
    queryKey: ["/api/problems/summary"],
    queryFn: async () => {
      const res = await fetch("/api/problems/summary");
      return res.json();
    },
  });

  // Fetch user's leetcode notes for the chapter drawer
  interface LeetcodeNote {
    id: number;
    problemNumber: string;
    title: string;
    difficulty: string;
    tags: string;
    notes: string;
    notesImageUrl?: string;
    codeImageUrl?: string;
    codeSolution?: string;
  }
  const { data: allLeetcodeNotes = [] } = useQuery<LeetcodeNote[]>({
    queryKey: ["/api/notes/leetcode"],
    queryFn: async () => {
      const res = await fetch("/api/notes/leetcode");
      return res.json();
    },
  });

  // Fetch Integrations API
  const { data: integrations = [], refetch: refetchIntegrations } = useQuery<UserIntegration[]>({
    queryKey: ["/api/problems/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/problems/integrations");
      return res.json();
    },
  });

  // Fetch LeetCode live stats
  interface LeetCodeStats {
    username: string;
    realName: string;
    ranking: number;
    streak: number;
    totalActiveDays: number;
    solved: { all: number; easy: number; medium: number; hard: number };
    total: { all: number; easy: number; medium: number; hard: number };
    recentSubmissions: { title: string; titleSlug: string; timestamp: string; lang: string; url: string }[];
  }
  const lcIntegration = integrations.find((i) => i.platform === "leetcode");
  const { data: lcStats, isLoading: lcLoading, isError: lcError, refetch: refetchLcStats } = useQuery<LeetCodeStats>({
    queryKey: ["/api/problems/leetcode-stats", lcIntegration?.username],
    queryFn: async () => {
      const res = await fetch("/api/problems/leetcode-stats");
      if (!res.ok) throw new Error("not_found");
      return res.json();
    },
    enabled: !!lcIntegration,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
    refetchProblems();
    refetchSummary();
    refetchIntegrations();
  };

  const toggleProblemStatus = async (p: Problem) => {
    const nextStatus = p.status === "solved" ? "pending" : "solved";
    await fetch(`/api/problems/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    invalidateAll();
    toast({
      title: nextStatus === "solved" ? "PROBLEM SOLVED! +25 XP 🎯" : "Status Reset",
      description: `Updated '${p.title}' status to ${nextStatus}.`,
    });
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: newPlatform,
        title: newTitle,
        difficulty: newDifficulty,
        category: newCategory,
      }),
    });
    setIsAddProblemOpen(false);
    setNewTitle("");
    invalidateAll();
    toast({ title: "Roadmap Assignment Added", description: `Added '${newTitle}' to target questions.` });
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcUsername.trim()) return;
    await fetch("/api/problems/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "leetcode", username: lcUsername.trim() }),
    });
    setIsLinkAccountsOpen(false);
    setLcUsername("");
    invalidateAll();
    toast({ title: "LeetCode Account Connected! 🧡", description: `Syncing stats for @${lcUsername.trim()}…` });
    setTimeout(() => setViewMode("LEETCODE"), 400);
  };

  const triggerApiSync = async () => {
    const res = await fetch("/api/problems/sync", { method: "POST" });
    const data = await res.json();
    invalidateAll();
    toast({ title: "Platform API Sync Complete ⚡", description: data.message });
  };

  const missions: Mission[] = useMemo(() => {
    const safeDbTasks = Array.isArray(dbTasks) ? dbTasks : [];
    return MASTER_CURRICULUM.map((curr, idx) => {
      const missionId = `m-${idx + 1}`;
      const matchedDb = safeDbTasks.find((t) => t.title === curr.title || t.title.includes(curr.title));
      return {
        ...curr,
        id: missionId,
        dbTaskId: matchedDb?.id,
        completed: matchedDb ? matchedDb.status === "completed" : false,
      };
    });
  }, [dbTasks]);

  const calendarSchedule: CalendarTask[] = useMemo(() => {
    const list: CalendarTask[] = [];
    let currentDate = new Date(START_DATE);
    let mernIdx = 0;
    let javaIdx = 0;

    for (let i = 0; i < 84; i++) {
      const dayOfWeekNum = currentDate.getDay();
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayOfWeek = format(currentDate, "EEEE");

      if (dayOfWeekNum === 0) {
        list.push({
          id: `cal-${i}`,
          dateStr,
          dayOfWeek,
          track: "REST",
          module: "Rest & Buffer",
          topic: "Weekly Review & Knowledge Consolidation",
          details: ["Review weak spots from the week", "Catch up on pending assignments", "Rest & recharge"],
          completed: false,
        });
      } else if (dayOfWeekNum === 1 || dayOfWeekNum === 3 || dayOfWeekNum === 5) {
        const m = MASTER_CURRICULUM[mernIdx % MASTER_CURRICULUM.length];
        list.push({
          id: `cal-${i}`,
          dateStr,
          dayOfWeek,
          track: "MERN",
          module: m.module,
          topic: m.title,
          details: m.objectives,
          completed: false,
        });
        mernIdx++;
      } else {
        const m = MASTER_CURRICULUM[javaIdx % MASTER_CURRICULUM.length];
        list.push({
          id: `cal-${i}`,
          dateStr,
          dayOfWeek,
          track: "JAVA_DSA",
          module: m.module,
          topic: m.title,
          details: m.objectives,
          completed: false,
        });
        javaIdx++;
      }
      currentDate = addDays(currentDate, 1);
    }
    return list;
  }, []);

  const calendarWeeks = useMemo(() => {
    const groups: { weekNum: number; startDateStr: string; tasks: CalendarTask[] }[] = [];
    const filtered = selectedTrack === "ALL" ? calendarSchedule : calendarSchedule.filter((t) => t.track === selectedTrack || t.track === "REST");
    for (let i = 0; i < filtered.length; i += 7) {
      const chunk = filtered.slice(i, i + 7);
      if (chunk.length > 0) {
        groups.push({
          weekNum: Math.floor(i / 7) + 1,
          startDateStr: chunk[0].dateStr,
          tasks: chunk,
        });
      }
    }
    return groups;
  }, [calendarSchedule, selectedTrack]);

  const currentMission = useMemo(() => missions.find((m) => m.isCurrent || (!m.completed && m.phaseId === 1)) || missions[2], [missions]);
  const completedMissionsCount = useMemo(() => missions.filter((m) => m.completed).length, [missions]);
  const totalXP = userStats?.xp ?? 0;
  const userLevel = userStats?.level ?? 1;
  const dailyStreak = userStats?.dailyStreak ?? 1;
  const faangReadinessPct = useMemo(() => Math.min(Math.round((completedMissionsCount / missions.length) * 100 + 20), 100), [completedMissionsCount, missions.length]);

  const handleToggleCompletion = async (mission: Mission) => {
    if (mission.dbTaskId) {
      if (mission.completed) {
        updateTask.mutate(
          { id: mission.dbTaskId, data: { status: "pending" } },
          { onSuccess: () => { invalidateAll(); toast({ title: "Mission Re-opened", description: `Reset '${mission.title}' to active status.` }); } }
        );
      } else {
        completeTask.mutate(
          { id: mission.dbTaskId },
          { onSuccess: () => { invalidateAll(); toast({ title: `MISSION ACCOMPLISHED! +10 XP ⚡`, description: `Completed '${mission.title}' in database.` }); } }
        );
      }
    } else {
      createTask.mutate(
        { data: { title: mission.title, description: mission.description, priority: "high", dueDate: format(new Date(), "yyyy-MM-dd") } },
        { onSuccess: (created) => { completeTask.mutate({ id: created.id }, { onSuccess: () => { invalidateAll(); toast({ title: `MISSION ACCOMPLISHED! +10 XP ⚡`, description: `Synced & completed '${mission.title}'.` }); } }); } }
      );
    }
  };

  const syncAllMissionsToDB = () => {
    const safeDbTasks = Array.isArray(dbTasks) ? dbTasks : [];
    MASTER_CURRICULUM.forEach((item) => {
      const exists = safeDbTasks.some((t) => t.title === item.title);
      if (!exists) {
        createTask.mutate({ data: { title: item.title, description: item.description, priority: item.difficulty === "ELITE" || item.difficulty === "ADVANCED" ? "high" : "medium", dueDate: format(new Date(), "yyyy-MM-dd") } });
      }
    });
    invalidateAll();
    toast({ title: "Full Roadmap Synchronized! 🔄", description: `Linked study missions to DB Tasks & Admin Panel.` });
  };

  const exportCalendar = (task: CalendarTask) => {
    const title = encodeURIComponent(`[Study] ${task.module}: ${task.topic}`);
    const details = encodeURIComponent(`Details:\n- ${task.details.join("\n- ")}`);
    const dateFormatted = task.dateStr.replace(/-/g, "");
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateFormatted}T100000Z/${dateFormatted}T120000Z`;
    window.open(googleUrl, "_blank");
  };

  const filteredMissions = useMemo(() => {
    if (selectedTrack === "ALL") return missions;
    return missions.filter((m) => m.track === selectedTrack);
  }, [missions, selectedTrack]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 text-white">
      {/* ── HEADER & THREE-WAY VIEW SWITCHER TOGGLE ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase mb-1.5" style={{ color: "#FFB6C1" }}>
            <Sparkles size={14} className="animate-pulse text-[#FFB6C1]" />
            <span>AI Mission Control · LeetCode & GFG Live Sync Engine</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl lg:text-5xl font-black tracking-tight leading-none">
            Study <span className="gradient-text-pink">Roadmap & Matrix</span>
          </motion.h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* VIEW SWITCHER TOGGLE */}
          <div className="flex items-center p-1.5 rounded-2xl bg-black/50 border border-white/15 backdrop-blur-md">
            <button onClick={() => setViewMode("MISSION_CONTROL")} className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${viewMode === "MISSION_CONTROL" ? "bg-gradient-to-r from-[#FFB6C1] to-[#C8A2C8] text-[#1a1a24] shadow-[0_0_15px_rgba(255,182,193,0.4)]" : "text-white/40 hover:text-white/80"}`}>
              <LayoutGrid size={14} /> HUD
            </button>
            <button onClick={() => setViewMode("CALENDAR")} className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${viewMode === "CALENDAR" ? "bg-gradient-to-r from-[#90EE90] to-[#AFEEEE] text-[#1a1a24] shadow-[0_0_15px_rgba(144,238,144,0.4)]" : "text-white/40 hover:text-white/80"}`}>
              <CalendarIcon size={14} /> Dates
            </button>
            <button onClick={() => setViewMode("PROBLEMS")} className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${viewMode === "PROBLEMS" ? "bg-gradient-to-r from-[#FFD700] to-[#FF8C69] text-[#1a1a24] shadow-[0_0_15px_rgba(255,215,0,0.4)]" : "text-white/40 hover:text-white/80"}`}>
              <Code2 size={14} /> Problem Matrix
            </button>
            <button onClick={() => setViewMode("LEETCODE")} className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${viewMode === "LEETCODE" ? "bg-gradient-to-r from-[#FFA500] to-[#FFD700] text-[#1a1a24] shadow-[0_0_15px_rgba(255,165,0,0.4)]" : "text-white/40 hover:text-white/80"}`}>
              <Globe size={14} /> LeetCode
            </button>
            <button onClick={() => setViewMode("SIGMA9")} className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${viewMode === "SIGMA9" ? "bg-gradient-to-r from-[#C8A2C8] to-[#90EE90] text-[#1a1a24] shadow-[0_0_15px_rgba(200,162,200,0.4)]" : "text-white/40 hover:text-white/80"}`}>
              <Layers size={14} /> Sigma 9
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: MISSION CONTROL HUD ── */}
      {viewMode === "MISSION_CONTROL" && (
        <div className="space-y-8">
          {/* Hero HUD */}
          <TiltPanel glowColor="rgba(255,182,193,0.35)">
            <div className="rounded-3xl p-6 lg:p-8 relative overflow-hidden" style={GLASS_CARD}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
                <div className="border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"><Compass size={12} className="text-[#FFB6C1]" /> 01. Current Sector</div>
                  <div className="text-xl font-black text-white mb-1">Phase 01: Core Architecture</div>
                  <div className="text-xs text-white/50">Level {userLevel} Engineer · Top 15% Rank Progress</div>
                </div>
                <div className="border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"><Play size={12} className="text-[#90EE90]" /> 02. Active Target</div>
                  <div className="text-xl font-black text-[#90EE90] truncate" title={currentMission.title}>{currentMission.title}</div>
                  <div className="text-xs text-white/50 truncate">{currentMission.module} · {currentMission.duration}</div>
                </div>
                <div className="border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"><Zap size={12} className="text-[#C8A2C8]" /> 03. Impact & Skill Payload</div>
                  <div className="text-sm font-bold text-white/90 line-clamp-2">Unlocks dynamic UI state engine & reactive DOM tree node synchronization.</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"><Lock size={12} className="text-[#AFEEEE]" /> 04. Tactical Gateway</div>
                  <div className="text-xl font-black text-[#AFEEEE] truncate">Singly & Doubly LL</div>
                  <div className="text-xs text-white/50">Unlocks Phase 02 Async Matrix (+180 XP)</div>
                </div>
              </div>
            </div>
          </TiltPanel>

          {/* Master Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-10">
              {PHASES.map((phase) => {
                const phaseMissions = filteredMissions.filter((m) => m.phaseId === phase.id);
                if (phaseMissions.length === 0) return null;
                const PhaseIcon = phase.icon;
                return (
                  <div key={phase.id} className="relative space-y-4">
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-white/15 via-white/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg bg-white/10 border-white/20 text-white" style={{ borderColor: `${phase.color}50` }}>
                        <PhaseIcon size={20} style={{ color: phase.color }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: phase.color }}>{phase.title}</div>
                        <div className="text-sm font-semibold text-white/60">{phase.subtitle}</div>
                      </div>
                    </div>
                    <div className="pl-4 lg:pl-14 space-y-3 relative z-10">
                      {phaseMissions.map((mission) => (
                        <div key={mission.id} className="rounded-2xl border bg-white/4 border-white/10 p-4 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white/40 mb-1">{mission.module}</div>
                            <div className="text-base font-bold text-white">{mission.title}</div>
                          </div>
                          <button onClick={() => handleToggleCompletion(mission)} className={`px-3 py-1 rounded-xl text-xs font-bold ${mission.completed ? "bg-white/10 text-white" : "bg-[#90EE90] text-[#1a1a24]"}`}>
                            {mission.completed ? "Done" : "Complete"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="lg:sticky lg:top-8 space-y-6">
              <TiltPanel glowColor="rgba(255,182,193,0.45)">
                <div className="rounded-3xl p-6 space-y-4" style={GLASS_CARD}>
                  <div className="text-lg font-black text-white">Telemetry</div>
                  <div className="text-sm text-white/60">XP: <span className="font-bold text-white">{totalXP}</span></div>
                  <div className="text-sm text-white/60">Streak: <span className="font-bold text-white">{dailyStreak} Days</span></div>
                </div>
              </TiltPanel>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: 12-WEEK CALENDAR & DATES ── */}
      {viewMode === "CALENDAR" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5"><div className="text-xs font-bold text-white/40 uppercase">Pace</div><div className="text-2xl font-black text-white">6 Days / Wk</div></div>
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5"><div className="text-xs font-bold text-white/40 uppercase">Start</div><div className="text-2xl font-black text-[#FFB6C1]">June 27, 2026</div></div>
            <div className="rounded-2xl p-5 border border-white/10 bg-white/5"><div className="text-xs font-bold text-white/40 uppercase">Target</div><div className="text-2xl font-black text-[#90EE90]">Sept 18, 2026</div></div>
          </div>
          <div className="space-y-6">
            {calendarWeeks.map((week) => (
              <div key={week.weekNum} className="space-y-3">
                <h3 className="text-base font-bold text-white">Week {week.weekNum}</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {week.tasks.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-between" style={{ minHeight: 140 }}>
                      <div>
                        <div className="text-[10px] font-bold text-white/40 uppercase">{t.dayOfWeek.slice(0,3)}</div>
                        <div className="text-xs font-bold text-white mt-1 line-clamp-2">{t.topic}</div>
                      </div>
                      {t.track !== "REST" && (
                        <button onClick={() => exportCalendar(t)} className="text-[10px] text-[#FFB6C1] flex items-center gap-1 mt-2">
                          <ExternalLink size={10} /> Sync
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIEW 3: LEETCODE & GFG PRACTICE MATRIX ── */}
      {viewMode === "PROBLEMS" && (
        <div className="space-y-8">
          {/* Top Control Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl border border-white/10 bg-white/4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700]">
                <Globe size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">LeetCode & GFG Practice Engine</h2>
                <p className="text-xs text-white/50">Real-time status synchronization for classwork & homework questions</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLinkAccountsOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white flex items-center gap-2 border border-white/10 transition-transform active:scale-95"
              >
                <Key size={14} className="text-[#FFB6C1]" /> Link Accounts & API Keys
              </button>
              <button
                onClick={triggerApiSync}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#FFD700] to-[#FF8C69] text-[#1a1a24] flex items-center gap-2 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-transform active:scale-95"
              >
                <RefreshCw size={14} /> Sync Platform Progress Now
              </button>
            </div>
          </div>

          {/* Aggregated Progress Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#FFD700]/30 bg-[#FFD700]/5 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFD700]">LeetCode Solved</div>
              <div className="text-3xl font-black text-white mt-1">
                {problemSummary?.leetcodeSolved ?? 0} <span className="text-sm font-normal text-white/40">/ {problemSummary?.leetcodeTotal ?? 0}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-1">Official LeetCode GraphQL Sync</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#90EE90]/30 bg-[#90EE90]/5 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-[#90EE90]">GFG Solved</div>
              <div className="text-3xl font-black text-white mt-1">
                {problemSummary?.gfgSolved ?? 0} <span className="text-sm font-normal text-white/40">/ {problemSummary?.gfgTotal ?? 0}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-1">GeeksforGeeks Practice Engine</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#FFB6C1]/30 bg-[#FFB6C1]/5 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFB6C1]">Classwork Completed</div>
              <div className="text-3xl font-black text-white mt-1">
                {problemSummary?.classworkSolved ?? 0} <span className="text-sm font-normal text-white/40">/ {problemSummary?.classworkTotal ?? 0}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-1">In-Class Live Demonstrations</div>
            </div>

            <div className="p-5 rounded-2xl border border-[#C8A2C8]/30 bg-[#C8A2C8]/5 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-[#C8A2C8]">Homework Solved</div>
              <div className="text-3xl font-black text-white mt-1">
                {problemSummary?.homeworkSolved ?? 0} <span className="text-sm font-normal text-white/40">/ {problemSummary?.homeworkTotal ?? 0}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-1">Self-Paced Assignment Roadmap</div>
            </div>
          </div>

          {/* Linked Accounts HUD */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-black/30 text-xs">
            <div className="font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
              <ShieldCheck size={14} className="text-[#90EE90]" /> Secure Linked Connections:
            </div>
            {integrations.map((item) => (
              <span key={item.id} className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="font-bold text-white uppercase">{item.platform}</span>
                <span className="text-white/60">@{item.username}</span>
                <span className="w-2 h-2 rounded-full bg-[#90EE90] animate-pulse" />
              </span>
            ))}
            {integrations.length === 0 && (
              <span className="text-white/40 italic">No external accounts linked yet. Click "Link Accounts" above.</span>
            )}
          </div>

          {/* Problems Table Control & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Filter size={14} className="text-white/40 mr-1" />
                <button
                  onClick={() => setProblemPlatformFilter("all")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${problemPlatformFilter === "all" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
                >
                  All Platforms
                </button>
                <button
                  onClick={() => setProblemPlatformFilter("leetcode")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${problemPlatformFilter === "leetcode" ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30" : "text-white/40 hover:text-white/70"}`}
                >
                  LeetCode
                </button>
                <button
                  onClick={() => setProblemPlatformFilter("gfg")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${problemPlatformFilter === "gfg" ? "bg-[#90EE90]/20 text-[#90EE90] border border-[#90EE90]/30" : "text-white/40 hover:text-white/70"}`}
                >
                  GFG
                </button>
                <span className="text-white/20">|</span>
                <button
                  onClick={() => setProblemCategoryFilter(problemCategoryFilter === "classwork" ? "all" : "classwork")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${problemCategoryFilter === "classwork" ? "bg-[#FFB6C1]/20 text-[#FFB6C1] border border-[#FFB6C1]/30" : "text-white/40 hover:text-white/70"}`}
                >
                  Classwork
                </button>
                <button
                  onClick={() => setProblemCategoryFilter(problemCategoryFilter === "homework" ? "all" : "homework")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${problemCategoryFilter === "homework" ? "bg-[#C8A2C8]/20 text-[#C8A2C8] border border-[#C8A2C8]/30" : "text-white/40 hover:text-white/70"}`}
                >
                  Homework
                </button>
              </div>

              <button
                onClick={() => setIsAddProblemOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 border border-white/10 self-start sm:self-auto"
              >
                <Plus size={14} /> Add Assignment
              </button>
            </div>

            {/* Questions Table */}
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-md">
              <div className="grid grid-cols-12 p-3.5 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/40">
                <div className="col-span-1">Status</div>
                <div className="col-span-5">Problem Title</div>
                <div className="col-span-2">Platform</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="divide-y divide-white/5">
                {problems.map((p) => {
                  const isSolved = p.status === "solved";
                  const isLc = p.platform === "leetcode";

                  return (
                    <div key={p.id} className="grid grid-cols-12 p-3.5 items-center text-xs hover:bg-white/3 transition-colors">
                      <div className="col-span-1">
                        <button onClick={() => toggleProblemStatus(p)} className="transition-transform hover:scale-110">
                          {isSolved ? <CheckCircle2 size={18} className="text-[#90EE90]" /> : <Circle size={18} className="text-white/20 hover:text-white/60" />}
                        </button>
                      </div>
                      <div className="col-span-5 pr-4">
                        <div className={`font-bold ${isSolved ? "line-through text-white/40" : "text-white"}`}>{p.title}</div>
                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{p.problemSlug}</div>
                      </div>
                      <div className="col-span-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isLc ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20" : "bg-[#90EE90]/10 text-[#90EE90] border border-[#90EE90]/20"}`}>
                          {isLc ? "LeetCode" : "GFG"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.category === "classwork" ? "bg-[#FFB6C1]/10 text-[#FFB6C1]" : "bg-[#C8A2C8]/10 text-[#C8A2C8]"}`}>
                          {p.category}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        >
                          Solve <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  );
                })}

                {problems.length === 0 && (
                  <div className="p-8 text-center text-xs text-white/40 italic">
                    No matching roadmap practice questions found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 5: CURRICULA TRACKER ── */}
      {viewMode === "SIGMA9" && (
        <div className="space-y-5">

          {/* ── Curriculum Picker ── */}
          <div className="flex flex-wrap gap-3">
            {CURRICULA.map((cur) => {
              const allCh = cur.tracks.flatMap((t) => t.categories.flatMap((c) => c.chapters));
              const doneCh = allCh.filter((ch) => sigma9Progress[ch.id]).length;
              const pct = allCh.length > 0 ? Math.round((doneCh / allCh.length) * 100) : 0;
              const isActive = sigma9CurriculumId === cur.id;
              return (
                <button
                  key={cur.id}
                  onClick={() => {
                    setSigma9CurriculumId(cur.id);
                    setSigma9Track(cur.tracks[0]?.id ?? "");
                    setExpandedSigmaCategory(null);
                  }}
                  className="flex-1 min-w-[160px] rounded-2xl p-4 text-left transition-all"
                  style={{
                    background: isActive ? `${cur.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? cur.color + "44" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: isActive ? `0 0 20px ${cur.color}15` : "none",
                  }}
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: isActive ? cur.color : "rgba(255,255,255,0.3)" }}>{cur.subtitle}</div>
                  <div className="text-sm font-black text-white/90 mb-2">{cur.label}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all" style={{ background: cur.color, width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: cur.color }}>{pct}%</span>
                  </div>
                  <div className="text-[10px] text-white/25 mt-1">{doneCh}/{allCh.length} topics</div>
                </button>
              );
            })}
          </div>

          {/* ── Active curriculum header ── */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={GLASS_CARD}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 20% 50%, ${activeCurriculum.color}0a 0%, transparent 65%)` }} />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
              <div className="flex-1">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: activeCurriculum.color }}>{activeCurriculum.subtitle}</div>
                <h2 className="text-lg font-black text-white">{activeCurriculum.label}</h2>
              </div>
              <div className="flex items-center gap-4">
                {activeCurriculum.tracks.map((t) => {
                  const total = t.categories.flatMap((c) => c.chapters).length;
                  const done = t.categories.flatMap((c) => c.chapters).filter((ch) => sigma9Progress[ch.id]).length;
                  return (
                    <div key={t.id} className="text-center">
                      <div className="text-base font-black" style={{ color: t.color }}>{done}<span className="text-white/25 text-xs font-normal">/{total}</span></div>
                      <div className="text-[9px] uppercase tracking-widest text-white/30">{t.label.split(" ")[0]}</div>
                    </div>
                  );
                })}
                <div className="text-center pl-4 border-l border-white/10">
                  <div className="text-xl font-black" style={{ color: activeCurriculum.color }}>{sigmaProgressPct}%</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/30">Done</div>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full overflow-hidden relative z-10" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full" style={{ background: activeCurriculum.color, width: `${sigmaProgressPct}%` }} initial={{ width: 0 }} animate={{ width: `${sigmaProgressPct}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
            </div>
          </div>

          {/* ── Track Selector ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeCurriculum.tracks.map((t) => {
              const total = t.categories.flatMap((c) => c.chapters).length;
              const done = t.categories.flatMap((c) => c.chapters).filter((ch) => sigma9Progress[ch.id]).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const active = sigmaActiveTrack.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSigma9Track(t.id); setExpandedSigmaCategory(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: active ? `${t.color}22` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? t.color + "55" : "rgba(255,255,255,0.06)"}`,
                    color: active ? t.color : "rgba(255,255,255,0.4)",
                  }}
                >
                  {t.label}
                  <span className="text-[10px] opacity-60">{pct}%</span>
                </button>
              );
            })}
          </div>

          {/* ── Categories + Chapters ── */}
          <div className="space-y-3">
            {sigmaActiveTrack.categories.map((cat) => {
              const catDone = cat.chapters.filter((ch) => sigma9Progress[ch.id]).length;
              const catTotal = cat.chapters.length;
              const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
              const isOpen = expandedSigmaCategory === cat.id;
              const allDone = catDone === catTotal;
              return (
                <div key={cat.id} className="rounded-2xl overflow-hidden" style={{ ...GLASS_CARD, border: `1px solid ${allDone ? sigmaActiveTrack.color + "33" : "rgba(255,255,255,0.08)"}` }}>
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-white/[0.02]"
                    onClick={() => setExpandedSigmaCategory(isOpen ? null : cat.id)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black" style={{ background: allDone ? sigmaActiveTrack.color + "33" : "rgba(255,255,255,0.05)", color: allDone ? sigmaActiveTrack.color : "rgba(255,255,255,0.4)" }}>
                      {allDone ? <Check size={14} /> : catDone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white/90">{cat.name}</span>
                        {allDone && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: sigmaActiveTrack.color + "22", color: sigmaActiveTrack.color }}>Done</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", maxWidth: 120 }}>
                          <div className="h-full rounded-full transition-all" style={{ background: sigmaActiveTrack.color, width: `${catPct}%` }} />
                        </div>
                        <span className="text-[10px] text-white/30">{catDone}/{catTotal}</span>
                      </div>
                    </div>
                    <ChevronDown size={14} className="flex-shrink-0 text-white/30 transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                        <div className="border-t border-white/05 px-5 pb-4 pt-2 space-y-1">
                          {cat.chapters.map((ch) => {
                            const done = !!sigma9Progress[ch.id];
                            const lcCount = parseLCNumbers(ch.overview ?? "").length;
                            return (
                              <div
                                key={ch.id}
                                onClick={() => setSelectedChapter({ id: ch.id, name: ch.name, overview: ch.overview ?? "", trackColor: sigmaActiveTrack.color })}
                                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.05] cursor-pointer group"
                                style={{ background: done ? sigmaActiveTrack.color + "0d" : "transparent" }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleSigmaChapter(ch.id); }}
                                  className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border transition-all hover:scale-110"
                                  style={{ borderColor: done ? sigmaActiveTrack.color : "rgba(255,255,255,0.2)", background: done ? sigmaActiveTrack.color : "transparent" }}
                                >
                                  {done && <Check size={10} color="#1a1a24" strokeWidth={3} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold" style={{ color: done ? sigmaActiveTrack.color : "rgba(255,255,255,0.8)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{ch.name}</span>
                                    {lcCount > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: sigmaActiveTrack.color + "22", color: sigmaActiveTrack.color }}>
                                        {lcCount} LC
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{ch.overview}</div>
                                </div>
                                <ExternalLink size={12} className="flex-shrink-0 mt-1 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 4: LEETCODE LIVE STATS ── */}
      {viewMode === "LEETCODE" && (
        <div className="space-y-6">
          {!lcIntegration ? (
            /* ── NOT CONNECTED ── */
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-10 flex flex-col items-center gap-6 text-center" style={GLASS_CARD}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-[#FFA500]/10 border border-[#FFA500]/20 text-5xl">🧡</div>
              <div>
                <div className="text-2xl font-black text-white mb-2">Connect Your LeetCode Account</div>
                <div className="text-sm text-white/50 max-w-md">Enter your LeetCode username to sync your real progress — problems solved, contest ranking, streak, and recent submissions.</div>
              </div>
              <button
                onClick={() => setIsLinkAccountsOpen(true)}
                className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#FFA500] to-[#FFD700] text-[#1a1a24] hover:opacity-90 flex items-center gap-2"
              >
                <Globe size={16} /> Connect LeetCode Account
              </button>
            </motion.div>
          ) : lcLoading ? (
            /* ── LOADING ── */
            <div className="rounded-3xl p-12 flex items-center justify-center gap-3" style={GLASS_CARD}>
              <RefreshCw size={20} className="animate-spin text-[#FFA500]" />
              <span className="text-white/60 font-semibold">Fetching your LeetCode stats…</span>
            </div>
          ) : lcError || !lcStats ? (
            /* ── ERROR / USER NOT FOUND ── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl p-10 flex flex-col items-center gap-4 text-center" style={GLASS_CARD}>
              <div className="text-4xl">⚠️</div>
              <div className="text-xl font-black text-white">Could not find LeetCode user <span className="text-[#FFA500]">@{lcIntegration.username}</span></div>
              <div className="text-sm text-white/50">Make sure the username is correct — LeetCode usernames are case-sensitive.</div>
              <button onClick={() => setIsLinkAccountsOpen(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-2">
                <Edit3 size={14} /> Update Username
              </button>
            </motion.div>
          ) : (
            /* ── STATS DASHBOARD ── */
            <div className="space-y-6">
              {/* Profile Header */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={GLASS_CARD}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFA500] to-[#FFD700] flex items-center justify-center text-[#1a1a24] font-black text-2xl shrink-0">
                    {lcStats.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFA500] mb-0.5">LeetCode · Live Sync</div>
                    <div className="text-2xl font-black text-white">{lcStats.realName || lcStats.username}</div>
                    <a href={`https://leetcode.com/${lcStats.username}/`} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-[#FFA500] flex items-center gap-1 transition-colors">
                      @{lcStats.username} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-black text-white">{lcStats.ranking > 0 ? lcStats.ranking.toLocaleString() : "—"}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-0.5">Global Rank</div>
                  </div>
                  <div className="text-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-black text-[#FFA500]">{lcStats.streak}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-0.5">🔥 Day Streak</div>
                  </div>
                  <div className="text-center px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-black text-[#90EE90]">{lcStats.totalActiveDays}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-0.5">Active Days</div>
                  </div>
                  <button onClick={() => refetchLcStats()} className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 flex items-center gap-1.5 transition-colors">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </motion.div>

              {/* Solved Rings */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Total */}
                {[
                  { label: "Total Solved", val: lcStats.solved.all, total: lcStats.total.all, color: "#FFA500", ringColor: "#FFD700" },
                  { label: "Easy", val: lcStats.solved.easy, total: lcStats.total.easy, color: "#90EE90", ringColor: "#90EE90" },
                  { label: "Medium", val: lcStats.solved.medium, total: lcStats.total.medium, color: "#FFA500", ringColor: "#FFA500" },
                  { label: "Hard", val: lcStats.solved.hard, total: lcStats.total.hard, color: "#FF6B6B", ringColor: "#FF6B6B" },
                ].map(({ label, val, total, color, ringColor }) => {
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  const r = 38; const circ = 2 * Math.PI * r;
                  return (
                    <div key={label} className="rounded-2xl p-5 flex flex-col items-center gap-3" style={GLASS_CARD}>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                          <circle cx="48" cy="48" r={r} fill="none" stroke={ringColor} strokeWidth="8"
                            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
                        </svg>
                        <div className="text-center z-10">
                          <div className="text-2xl font-black text-white leading-none">{val}</div>
                          <div className="text-[10px] text-white/40">/{total}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-white/50">{pct.toFixed(1)}% done</div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Recent Submissions */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl p-6 space-y-4" style={GLASS_CARD}>
                <div className="flex items-center justify-between">
                  <div className="text-base font-black text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#90EE90]" /> Recent Accepted Submissions
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Last 10</span>
                </div>
                {lcStats.recentSubmissions.length === 0 ? (
                  <div className="text-sm text-white/40 italic py-4 text-center">No accepted submissions yet — get coding! 🚀</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {lcStats.recentSubmissions.map((sub, i) => {
                      const ts = Number(sub.timestamp) * 1000;
                      const ago = isNaN(ts) ? "" : (() => {
                        const diff = Date.now() - ts;
                        const d = Math.floor(diff / 86400000);
                        const h = Math.floor((diff % 86400000) / 3600000);
                        if (d > 0) return `${d}d ago`;
                        if (h > 0) return `${h}h ago`;
                        return "Just now";
                      })();
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                          className="flex items-center justify-between py-3 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 size={15} className="text-[#90EE90] shrink-0" />
                            <a href={sub.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold text-white hover:text-[#FFA500] transition-colors truncate flex items-center gap-1">
                              {sub.title} <ExternalLink size={11} className="shrink-0 opacity-50" />
                            </a>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-white/50 font-mono">{sub.lang}</span>
                            <span className="text-[11px] text-white/30 min-w-[52px] text-right">{ago}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Change account link */}
              <div className="flex justify-end">
                <button onClick={() => setIsLinkAccountsOpen(true)} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                  <Edit3 size={12} /> Change LeetCode username
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DIALOG 1: LINK ACCOUNTS ── */}
      <AnimatePresence>
        {isLinkAccountsOpen && (
          <Dialog open={isLinkAccountsOpen} onOpenChange={setIsLinkAccountsOpen}>
            <DialogContent className="sm:max-w-[420px] bg-[#12121c] text-white border-white/10 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Globe size={20} className="text-[#FFA500]" /> Connect LeetCode Account
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveIntegrations} className="space-y-5 mt-2">
                <div className="p-3 rounded-xl bg-[#FFA500]/8 border border-[#FFA500]/20 text-xs text-white/70 leading-relaxed">
                  ✨ <span className="font-bold text-white">No API key needed.</span> We use LeetCode's public GraphQL API — just your username is enough to sync all your stats.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#FFA500]">LeetCode Username</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#FFA500] transition-colors">
                    <span className="text-white/30 text-sm font-mono">leetcode.com/u/</span>
                    <input
                      type="text"
                      required
                      placeholder="your-username"
                      value={lcUsername}
                      onChange={(e) => setLcUsername(e.target.value.trim())}
                      className="bg-transparent flex-1 text-sm text-white focus:outline-none font-mono"
                      autoFocus
                    />
                  </div>
                  {lcIntegration && (
                    <div className="text-[11px] text-white/40 pl-1">Currently linked: <span className="text-[#FFA500]">@{lcIntegration.username}</span></div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                  <button type="button" onClick={() => setIsLinkAccountsOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-white/5 text-white/60">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-[#FFA500] to-[#FFD700] text-[#1a1a24] hover:opacity-90 flex items-center gap-2">
                    <CheckSquare size={15} /> Save & Sync
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ── DIALOG 2: ADD ROADMAP ASSIGNMENT ── */}
      <AnimatePresence>
        {isAddProblemOpen && (
          <Dialog open={isAddProblemOpen} onOpenChange={setIsAddProblemOpen}>
            <DialogContent className="sm:max-w-[420px] bg-[#12121c] text-white border-white/10 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">Add Roadmap Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProblem} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/60">Problem Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trapping Rain Water"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFB6C1]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/60">Platform</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFB6C1]"
                    >
                      <option value="leetcode" className="bg-[#12121c]">LeetCode</option>
                      <option value="gfg" className="bg-[#12121c]">GeeksforGeeks</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/60">Assignment Type</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFB6C1]"
                    >
                      <option value="classwork" className="bg-[#12121c]">Classwork</option>
                      <option value="homework" className="bg-[#12121c]">Homework</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddProblemOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-white/5 text-white/60">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FF8C69] text-[#1a1a24] hover:opacity-90">
                    Add Assignment
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ── CHAPTER DETAIL DRAWER ── */}
      <AnimatePresence>
        {selectedChapter && (() => {
          const lcNums = parseLCNumbers(selectedChapter.overview);
          const hasGfg = selectedChapter.overview.includes("[GFG]");
          const matchingNotes = allLeetcodeNotes.filter((n) => lcNums.includes(String(n.problemNumber)));
          const color = selectedChapter.trackColor;
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedChapter(null)}
                className="fixed inset-0 z-40"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col overflow-hidden"
                style={{ background: "rgba(18,18,28,0.98)", borderLeft: `1px solid ${color}33` }}
              >
                {/* Header */}
                <div className="flex items-start gap-4 p-6 border-b border-white/08" style={{ borderBottomColor: `${color}22` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    <BookOpen size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-black text-white leading-tight">{selectedChapter.name}</h2>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">{selectedChapter.overview}</p>
                  </div>
                  <button onClick={() => setSelectedChapter(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white flex-shrink-0 transition-all">
                    <X size={16} />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* LC Problems Section */}
                  {lcNums.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Link2 size={13} style={{ color }} />
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>LeetCode Problems</span>
                        <span className="text-[10px] text-white/30 ml-auto">{lcNums.filter(n => chapterSolvedProblems[n]).length}/{lcNums.length} solved</span>
                      </div>
                      <div className="space-y-2">
                        {lcNums.map((num) => {
                          const solved = !!chapterSolvedProblems[num];
                          const note = allLeetcodeNotes.find((n) => String(n.problemNumber) === num);
                          return (
                            <div key={num} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" style={{ background: solved ? `${color}12` : "rgba(255,255,255,0.04)", border: `1px solid ${solved ? color + "33" : "rgba(255,255,255,0.06)"}` }}>
                              <button
                                onClick={() => toggleChapterProblemSolved(num)}
                                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all hover:scale-110"
                                style={{ borderColor: solved ? color : "rgba(255,255,255,0.2)", background: solved ? color : "transparent" }}
                              >
                                {solved && <Check size={11} color="#1a1a24" strokeWidth={3} />}
                              </button>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-xs font-black" style={{ color: solved ? color : "rgba(255,255,255,0.6)", textDecoration: solved ? "line-through" : "none" }}>
                                  LC-{num}
                                </span>
                                {note && (
                                  <span className="text-[10px] font-semibold text-white/50 truncate">{note.title}</span>
                                )}
                                {note?.difficulty && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0" style={{
                                    background: note.difficulty === "Easy" ? "rgba(144,238,144,0.12)" : note.difficulty === "Medium" ? "rgba(255,215,0,0.12)" : "rgba(255,99,71,0.12)",
                                    color: note.difficulty === "Easy" ? "#90EE90" : note.difficulty === "Medium" ? "#FFD700" : "#FF6347"
                                  }}>{note.difficulty}</span>
                                )}
                              </div>
                              <a
                                href={`https://leetcode.com/problemset/?search=${num}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition-all"
                                title={`Open LC-${num} on LeetCode`}
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* GFG notice */}
                  {hasGfg && (
                    <div className="px-3 py-2.5 rounded-xl text-xs text-white/40 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <span className="font-bold text-green-400">GFG</span> problems referenced in this chapter —
                      <a href="https://practice.geeksforgeeks.org/" target="_blank" rel="noopener noreferrer" className="underline text-green-400 hover:text-green-300">open GFG</a>
                    </div>
                  )}

                  {/* No problems */}
                  {lcNums.length === 0 && !hasGfg && (
                    <div className="text-center py-6 text-white/25 text-xs">
                      No LeetCode problems listed for this chapter.
                    </div>
                  )}

                  {/* User's Notes Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <StickyNote size={13} style={{ color }} />
                      <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>Your Notes</span>
                    </div>
                    {matchingNotes.length === 0 ? (
                      <div className="rounded-xl px-4 py-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                        <FileText size={24} className="mx-auto mb-2 text-white/15" />
                        <p className="text-xs text-white/30">No notes saved yet for these problems.</p>
                        <p className="text-[11px] text-white/20 mt-1">Go to <span className="font-semibold">Notes & Problems</span> to add your solutions and handwritten notes.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matchingNotes.map((note) => (
                          <div key={note.id} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}22` }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}># {note.problemNumber}</span>
                              <span className="text-sm font-bold text-white/90 truncate">{note.title}</span>
                              {note.difficulty && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0" style={{
                                  background: note.difficulty === "Easy" ? "rgba(144,238,144,0.12)" : note.difficulty === "Medium" ? "rgba(255,215,0,0.12)" : "rgba(255,99,71,0.12)",
                                  color: note.difficulty === "Easy" ? "#90EE90" : note.difficulty === "Medium" ? "#FFD700" : "#FF6347"
                                }}>{note.difficulty}</span>
                              )}
                            </div>
                            {note.notes && <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{note.notes}</p>}
                            {note.notesImageUrl && (
                              <a href={note.notesImageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-semibold hover:opacity-80 transition-opacity" style={{ color }}>
                                <FileText size={11} /> View Handwritten Notes
                              </a>
                            )}
                            {note.codeImageUrl && (
                              <a href={note.codeImageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-semibold hover:opacity-80 transition-opacity" style={{ color }}>
                                <FileText size={11} /> View Code Screenshot
                              </a>
                            )}
                            {note.tags && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {note.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                                  <span key={tag} className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-white/40" style={{ background: "rgba(255,255,255,0.06)" }}>{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex items-center justify-between" style={{ borderTopColor: `${color}22` }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSigmaChapter(selectedChapter.id); setSelectedChapter(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{ background: sigma9Progress[selectedChapter.id] ? "rgba(255,255,255,0.06)" : `${color}22`, color: sigma9Progress[selectedChapter.id] ? "rgba(255,255,255,0.5)" : color, border: `1px solid ${sigma9Progress[selectedChapter.id] ? "rgba(255,255,255,0.1)" : color + "44"}` }}
                  >
                    <Check size={14} />
                    {sigma9Progress[selectedChapter.id] ? "Mark Incomplete" : "Mark Complete"}
                  </button>
                  <span className="text-[11px] text-white/25">{lcNums.filter(n => chapterSolvedProblems[n]).length} of {lcNums.length} problems solved</span>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

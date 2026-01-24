import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Showcase } from "@/features/Showcase";
import { SalaryBook } from "@/features/SalaryBook";
import { ToastProvider } from "@/components/ui";

function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">About</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        This is a template project.
      </p>
      <Link
        to="/"
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Back Home
      </Link>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Showcase />} />
          <Route path="/about" element={<About />} />
          <Route path="/salary-book" element={<SalaryBook />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}

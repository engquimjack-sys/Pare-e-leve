import React, { useState, useEffect } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarCalculatorProps {
  collapsed: boolean;
}

export default function SidebarCalculator({ collapsed }: SidebarCalculatorProps) {
  const [display, setDisplay] = useState<string>("0");
  const [equation, setEquation] = useState<string>("");
  const [showFloating, setShowFloating] = useState<boolean>(false);
  const [showExpanded, setShowExpanded] = useState<boolean>(false);

  const handleKeyPress = (val: string) => {
    if (val === "C") {
      setDisplay("0");
      setEquation("");
    } else if (val === "BK") {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay("0");
      }
    } else if (val === "=") {
      try {
        // Safe evaluation of basic math expressions using Function
        // Only allow numbers, decimal, and standard operators
        const cleanEq = (equation + display).replace(/[^0-9+\-*/.]/g, "");
        if (!cleanEq) return;
        
        // Use standard Function approach for safe math calculation
        const result = new Function(`return (${cleanEq})`)();
        
        if (result === Infinity || isNaN(result)) {
          setDisplay("Erro");
        } else {
          // Limit to 8 decimal places and format to remove trailing zeros
          const formattedResult = Number(result.toFixed(8)).toString();
          setDisplay(formattedResult);
        }
        setEquation("");
      } catch (e) {
        setDisplay("Erro");
      }
    } else if (["+", "-", "*", "/"].includes(val)) {
      // If we already have an operator trailing, replace it
      setEquation(display + " " + val + " ");
      setDisplay("0");
    } else {
      // Number or decimal point input
      if (val === ".") {
        if (display.includes(".")) return;
        setDisplay(display + ".");
      } else {
        if (display === "0" || display === "Erro") {
          setDisplay(val);
        } else {
          setDisplay(display + val);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Protect other inputs. Do not intercept keys if user is focused on typing in forms/search inputs
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || active.hasAttribute("contenteditable")) {
          return;
        }
      }

      // Check if calculator is visible
      const isVisible = collapsed ? showFloating : showExpanded;
      if (!isVisible) return;

      const key = e.key;

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        handleKeyPress(key);
      } else if (["+", "-", "*", "/"].includes(key)) {
        e.preventDefault();
        handleKeyPress(key);
      } else if (key === "." || key === ",") {
        e.preventDefault();
        handleKeyPress(".");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleKeyPress("=");
      } else if (key === "Backspace") {
        e.preventDefault();
        handleKeyPress("BK");
      } else if (key === "Escape" || key === "c" || key === "C") {
        e.preventDefault();
        handleKeyPress("C");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [collapsed, showFloating, showExpanded, display, equation]);

  const calculatorGrid = (
    <div id="calculator-inner-grid" className={`p-3 bg-[#090D16] rounded-2xl border border-white/5 space-y-2.5 text-gray-100 font-sans ${collapsed ? "w-56" : "w-full"}`}>
      {/* Title (Only visible in popup of collapsed mode to keep context) */}
      {collapsed && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-bold flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#FF6B00]" />
            Calculadora Rápida
          </span>
          <button 
            onClick={() => setShowFloating(false)}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Screen Display */}
      <div className="bg-[#111827] border border-white/5 p-2 px-3 rounded-xl text-right overflow-hidden select-all font-mono">
        <div className="text-[9px] text-gray-500 min-h-[14px] truncate tracking-wide">
          {equation}
        </div>
        <div className="text-base font-bold text-white truncate">
          {display}
        </div>
      </div>

      {/* Numerical and Functional Buttons Keypad */}
      <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
        <button
          onClick={() => handleKeyPress("C")}
          className="col-span-2 py-2 px-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold active:scale-95 transition-all outline-none"
        >
          Limpar
        </button>
        <button
          onClick={() => handleKeyPress("BK")}
          className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 flex items-center justify-center active:scale-95 transition-all outline-none"
          title="Backspace"
        >
          <Delete className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={() => handleKeyPress("/")}
          className="py-2 px-1 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] font-bold active:scale-95 transition-all outline-none"
        >
          /
        </button>

        {["7", "8", "9"].map((n) => (
          <button
            key={n}
            onClick={() => handleKeyPress(n)}
            className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 active:scale-95 transition-all outline-none"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleKeyPress("*")}
          className="py-2 px-1 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] font-bold active:scale-95 transition-all outline-none"
        >
          *
        </button>

        {["4", "5", "6"].map((n) => (
          <button
            key={n}
            onClick={() => handleKeyPress(n)}
            className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 active:scale-95 transition-all outline-none"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleKeyPress("-")}
          className="py-2 px-1 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] font-bold active:scale-95 transition-all outline-none"
        >
          -
        </button>

        {["1", "2", "3"].map((n) => (
          <button
            key={n}
            onClick={() => handleKeyPress(n)}
            className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 active:scale-95 transition-all outline-none"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleKeyPress("+")}
          className="py-2 px-1 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] font-bold active:scale-95 transition-all outline-none"
        >
          +
        </button>

        <button
          onClick={() => handleKeyPress("0")}
          className="col-span-2 py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 active:scale-95 transition-all outline-none"
        >
          0
        </button>
        <button
          onClick={() => handleKeyPress(".")}
          className="py-2 px-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 active:scale-95 transition-all outline-none"
        >
          .
        </button>
        <button
          onClick={() => handleKeyPress("=")}
          className="py-2 px-1 rounded-lg bg-[#FF6B00] hover:bg-orange-600 text-white font-bold active:scale-95 transition-all shadow-md shadow-orange-500/10 outline-none"
        >
          =
        </button>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div id="calculator-sidebar-container" className="relative flex justify-center w-full my-1">
        {/* Compact collapsed icon */}
        <button
          onClick={() => setShowFloating(!showFloating)}
          className={`p-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center outline-none ${showFloating ? "bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/10 hover:text-[#FF6B00]" : ""}`}
          title="Calculadora Rápida"
        >
          <Calculator className="w-5 h-5 shrink-0" />
        </button>

        {/* Floating popover next to collapsed sidebar */}
        <AnimatePresence>
          {showFloating && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-16 bottom-0 z-50 shadow-2xl"
            >
              {calculatorGrid}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div id="calculator-sidebar-container" className="px-3 py-1.5 border-t border-b border-white/5 my-2">
      {/* Accordion Trigger Button */}
      <button
        onClick={() => setShowExpanded(!showExpanded)}
        className={`w-full flex items-center justify-between p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-xs font-medium outline-none ${showExpanded ? "bg-white/5 text-[#FF6B00]" : ""}`}
      >
        <span className="flex items-center gap-2">
          <Calculator className={`w-4 h-4 transition-colors ${showExpanded ? "text-[#FF6B00]" : "text-gray-400"}`} />
          <span>Calculadora Rápida</span>
        </span>
        <motion.span
          animate={{ rotate: showExpanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-[10px] text-gray-500 font-bold"
        >
          {showExpanded ? "▲" : "▼"}
        </motion.span>
      </button>

      {/* Accordion panel */}
      <AnimatePresence initial={false}>
        {showExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {calculatorGrid}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

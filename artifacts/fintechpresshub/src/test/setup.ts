import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

vi.mock("wouter", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({ children, href, ...rest }: { children?: unknown; href?: string; [k: string]: unknown }) =>
      createElement("a", { href, ...rest }, children as never),
    useLocation: () => ["/", vi.fn()],
    useParams: () => ({}),
    useRoute: () => [false, {}],
    Switch: ({ children }: { children?: unknown }) => children,
    Route: ({ children }: { children?: unknown }) => children,
  };
});

vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  const motionProxy = new Proxy({} as Record<string, unknown>, {
    get(_, tag: string | symbol) {
      if (typeof tag === "symbol") return undefined;
      const tagStr = String(tag);
      return ({ children, ...props }: { children?: unknown; [k: string]: unknown }) =>
        createElement(tagStr, props as object, children as never);
    },
  });
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children?: unknown }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => true,
    useMotionValue: (init = 0) => ({ get: () => init, set: vi.fn() }),
    useTransform: () => ({ get: () => 0 }),
    animate: vi.fn(),
    useSpring: (init = 0) => ({ get: () => init, set: vi.fn() }),
  };
});

vi.mock("react-helmet-async", () => ({
  Helmet: () => null,
  HelmetProvider: ({ children }: { children?: unknown }) => children,
}));

vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    setFontSize() { return this; }
    setFont() { return this; }
    setTextColor() { return this; }
    text() { return this; }
    line() { return this; }
    rect() { return this; }
    setDrawColor() { return this; }
    setFillColor() { return this; }
    splitTextToSize() { return []; }
    addPage() { return this; }
    save() {}
    output() { return ""; }
    getNumberOfPages() { return 1; }
    setPage() { return this; }
    setLineWidth() { return this; }
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      scaleFactor: 1,
    };
  },
}));

vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  const stub = () => null;
  return {
    ResponsiveContainer: ({ children }: { children?: unknown }) =>
      createElement("div", { "data-testid": "recharts-container" }, children as never),
    BarChart: ({ children }: { children?: unknown }) => createElement("svg", null, children as never),
    LineChart: ({ children }: { children?: unknown }) => createElement("svg", null, children as never),
    PieChart: ({ children }: { children?: unknown }) => createElement("svg", null, children as never),
    AreaChart: ({ children }: { children?: unknown }) => createElement("svg", null, children as never),
    Bar: stub, Line: stub, XAxis: stub, YAxis: stub,
    Cell: stub, Tooltip: stub, ReferenceLine: stub,
    CartesianGrid: stub, Legend: stub, Pie: stub, Area: stub,
  };
});

vi.mock("@/components/PageHero", async () => {
  const { createElement } = await import("react");
  return {
    PageHero: ({ title }: { title?: unknown }) =>
      createElement("h1", { "data-testid": "page-hero" }, String(title ?? "")),
  };
});

vi.mock("@/components/PageMeta", () => ({ PageMeta: () => null }));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackPageview: vi.fn(),
  isAnalyticsAllowed: () => false,
}));

vi.mock("@/lib/metaData", () => ({
  SITE_URL: "https://www.fintechpresshub.com",
  META: {},
}));

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
  configurable: true,
});

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = "";
  thresholds = [];
} as unknown as typeof IntersectionObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Element.prototype.scrollIntoView = vi.fn();
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
global.URL.revokeObjectURL = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

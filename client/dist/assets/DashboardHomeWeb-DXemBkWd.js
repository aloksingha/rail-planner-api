const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/DashboardCharts-CnhYsCqg.js","assets/index-D1i000XD.js","assets/icons-DciIWsPJ.js","assets/charts-CJ7LU1mB.js","assets/pdf-export-BO05fxPA.js","assets/firebase-JmAEX3w6.js","assets/index-CWFCG5tw.css"])))=>i.map(i=>d[i]);
import { _ as D } from "./pdf-export-BO05fxPA.js";
import { j as e, b as L, m as r, L as k, a as z } from "./index-D1i000XD.js";
import {
  a as l,
  b as R,
  $ as IconTrend,
  U as IconUsers,
  aA as IconBag,
  o as IconAlert,
  av as IconActivity,
  a2 as IconPlus,
  J as IconClock,
  aB as IconTerminal,
  C as IconCheck,
  Z as IconZap,
  aD as IconArrowUpRight,
  d as IconShield,
  aC as IconChevronRight
} from "./icons-DciIWsPJ.js";
import { W as M } from "./WalletCard-BYJOdF-K.js";
import { I as N } from "./InteractiveCard-BjfR6jLN.js";
import { P as $ } from "./PromoBannerSlider-BoYvnqe4.js";
import "./charts-CJ7LU1mB.js";
import "./firebase-JmAEX3w6.js";

const J = R.lazy(() => D(() => import("./DashboardCharts-CnhYsCqg.js"), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6])));

const ModernStatCard = R.memo(({ title, value, icon: Icon, trend, trendUp = true, color = "blue", subtitle, to }) => {
  const colorSchemes = {
    blue: { bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-100 dark:border-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
    sky: { bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-100 dark:border-sky-500/20", text: "text-sky-600 dark:text-sky-400" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-100 dark:border-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-100 dark:border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
    rose: { bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-100 dark:border-rose-500/20", text: "text-rose-600 dark:text-rose-400" }
  };
  const scheme = colorSchemes[color] || colorSchemes.blue;

  const cardContent = e.jsxs("div", {
    className: "p-5 bg-white dark:bg-slate-900/90 rounded-[1.75rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group cursor-pointer relative overflow-hidden",
    children: [
      e.jsxs("div", {
        className: "flex items-center justify-between",
        children: [
          e.jsx("div", {
            className: "w-11 h-11 rounded-2xl " + scheme.bg + " " + scheme.border + " " + scheme.text + " border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm",
            children: e.jsx(Icon, { size: 20, strokeWidth: 2.5 })
          }),
          e.jsx(IconChevronRight, {
            size: 16,
            className: "text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
          })
        ]
      }),
      e.jsxs("div", {
        className: "mt-4",
        children: [
          e.jsx("p", {
            className: "text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight",
            children: title
          }),
          e.jsx("h3", {
            className: "text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1",
            children: value
          })
        ]
      }),
      e.jsx("div", {
        className: "mt-3 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center justify-between",
        children: trend
          ? e.jsxs("div", {
              className: "flex items-center gap-1 text-[11px] font-bold " + (trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"),
              children: [
                e.jsx("svg", {
                  className: "w-3 h-3 " + (trendUp ? "text-emerald-500" : "text-rose-500 rotate-180"),
                  fill: "none",
                  viewBox: "0 0 24 24",
                  stroke: "currentColor",
                  strokeWidth: 3,
                  children: e.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 10l7-7m0 0l7 7m-7-7v18" })
                }),
                e.jsx("span", { children: trend }),
                e.jsx("span", { className: "text-slate-400 dark:text-slate-500 font-normal ml-0.5", children: "vs yesterday" })
              ]
            })
          : subtitle
          ? e.jsx("span", {
              className: "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider",
              children: subtitle
            })
          : null
      })
    ]
  });

  return to ? e.jsx(k, { to: to, className: "block h-full", children: cardContent }) : cardContent;
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

function DashboardHome({ role: userRoleProp }) {
  const [stats, setStats] = l.useState(() => {
    try {
      const saved = sessionStorage.getItem("admin_dashboard_stats_v2") || localStorage.getItem("admin_dashboard_stats_v2");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activities, setActivities] = l.useState(() => {
    try {
      const saved = sessionStorage.getItem("admin_dashboard_activities") || localStorage.getItem("admin_dashboard_activities");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = l.useState(!stats);
  const [loadingActivities, setLoadingActivities] = l.useState(activities.length === 0);

  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("mimic_user") || localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  l.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const cachedStatsStr = sessionStorage.getItem("admin_dashboard_stats_v2") || localStorage.getItem("admin_dashboard_stats_v2");
        const cachedActivitiesStr = sessionStorage.getItem("admin_dashboard_activities") || localStorage.getItem("admin_dashboard_activities");
        const cachedTimeStr = sessionStorage.getItem("admin_dashboard_cache_time");
        if (cachedStatsStr && cachedActivitiesStr) {
          setStats(JSON.parse(cachedStatsStr));
          setActivities(JSON.parse(cachedActivitiesStr));
          setLoading(false);
          setLoadingActivities(false);
          if (cachedTimeStr && Date.now() - parseInt(cachedTimeStr, 10) < 30000) {
            return;
          }
        }
      } catch (cacheError) {
        console.warn("Failed to parse cached dashboard stats", cacheError);
      }

      try {
        const { data } = await L.get("/api/admin/dashboard-data");
        const statsData = data.stats;
        setStats(statsData);
        setActivities(data.activities);
        sessionStorage.setItem("admin_dashboard_stats_v2", JSON.stringify(statsData));
        sessionStorage.setItem("admin_dashboard_activities", JSON.stringify(data.activities));
        sessionStorage.setItem("admin_dashboard_cache_time", Date.now().toString());
        localStorage.setItem("admin_dashboard_stats_v2", JSON.stringify(statsData));
        localStorage.setItem("admin_dashboard_activities", JSON.stringify(data.activities));
      } catch (error) {
        console.error("Failed to fetch dashboard bundle", error);
        if (!stats) {
          setStats({ userCount: 0, teamCount: 0, todayBookings: 0, bookingCount: 0, todayAmount: 0, timeline: [] });
        }
      } finally {
        setLoading(false);
        setLoadingActivities(false);
      }
    };

    fetchDashboardData();
  }, []);

  const chartData = l.useMemo(() => {
    if (!stats || !stats.timeline) return [];
    return stats.timeline.map((t) => ({
      date: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      transactions: t.count,
      amount: t.amount || 0
    }));
  }, [stats]);

  const userRole = userRoleProp || user?.role || "CUSTOMER";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN";

  const todayOrders = stats?.todayBookings || 0;
  const totalVolume = stats?.todayAmount || 0;

  return e.jsxs("div", {
    className: "space-y-8 animate-in fade-in duration-500 pb-16 max-w-screen-2xl mx-auto",
    children: [
      /* 1. Header Banner */
      e.jsxs("div", {
        className: "flex flex-col md:flex-row md:items-center justify-between gap-4 px-1",
        children: [
          e.jsxs("div", {
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-2 mb-1.5",
                children: [
                  e.jsx("span", { className: "w-2 h-2 rounded-full bg-blue-600 animate-pulse" }),
                  e.jsx("span", {
                    className: "text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400",
                    children: "Tickets Pro V2 • Operations Control"
                  })
                ]
              }),
              e.jsxs("h1", {
                className: "text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight",
                children: [
                  "Welcome back! ",
                  e.jsx("span", { className: "inline-block animate-bounce", children: "👋" })
                ]
              }),
              e.jsx("p", {
                className: "text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1",
                children: "Here's what's happening across Tickets Pro today."
              })
            ]
          }),
          e.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm",
                children: [
                  e.jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" }),
                  e.jsx("span", { className: "text-xs font-bold text-slate-800 dark:text-slate-200", children: "Live Engine Online" })
                ]
              }),
              e.jsxs(k, {
                to: "/book-ticket",
                className: "flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all",
                children: [
                  e.jsx(IconPlus, { size: 16 }),
                  e.jsx("span", { children: "New Booking" })
                ]
              })
            ]
          })
        ]
      }),

      /* Promo Banner Slider */
      e.jsx($, {}),

      /* 2. 4 Modern KPI Stat Cards */
      e.jsx(r.div, {
        variants: containerVariants,
        initial: "hidden",
        animate: "show",
        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5",
        children: loading
          ? [1, 2, 3, 4].map((i) =>
              e.jsx("div", {
                key: i,
                className: "h-36 rounded-[1.75rem] bg-white dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-white/5 shadow-sm"
              })
            )
          : e.jsxs(e.Fragment, {
              children: [
                e.jsx(r.div, {
                  variants: itemVariants,
                  children: e.jsx(ModernStatCard, {
                    title: "Total Revenue",
                    value: "₹" + (stats?.todayAmount || 0).toLocaleString(),
                    icon: IconTrend,
                    color: "blue",
                    trend: "+12.5%",
                    trendUp: true,
                    to: "/sales"
                  })
                }),
                e.jsx(r.div, {
                  variants: itemVariants,
                  children: e.jsx(ModernStatCard, {
                    title: "Total Platform Users",
                    value: (stats?.userCount || 0).toLocaleString(),
                    icon: IconUsers,
                    color: "sky",
                    trend: "+8.3%",
                    trendUp: true,
                    to: "/users"
                  })
                }),
                e.jsx(r.div, {
                  variants: itemVariants,
                  children: e.jsx(ModernStatCard, {
                    title: "Today's Bookings",
                    value: (stats?.todayBookings || 0).toLocaleString(),
                    icon: IconBag,
                    color: "indigo",
                    trend: "+6.1%",
                    trendUp: true,
                    to: "/manage-bookings"
                  })
                }),
                e.jsx(r.div, {
                  variants: itemVariants,
                  children: e.jsx(ModernStatCard, {
                    title: stats?.failedBookingCount > 0 ? "Failed Bookings" : "Pending Price Requests",
                    value: (stats?.failedBookingCount > 0 ? stats.failedBookingCount : stats?.priceRequestCount || 0).toLocaleString(),
                    icon: stats?.failedBookingCount > 0 ? IconAlert : IconActivity,
                    color: stats?.failedBookingCount > 0 ? "rose" : "amber",
                    trend: stats?.failedBookingCount > 0 ? "Action Needed" : "+4.7%",
                    trendUp: stats?.failedBookingCount === 0,
                    to: stats?.failedBookingCount > 0 ? "/failed-bookings" : "/price-requests"
                  })
                })
              ]
            })
      }),

      /* 3. Analytics Chart + Circular Donut Split Grid */
      e.jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start",
        children: [
          /* Left (2 cols): Revenue Overview Chart */
          e.jsxs("div", {
            className: "lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]",
            children: [
              e.jsxs("div", {
                className: "flex items-center justify-between mb-6",
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          e.jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-white tracking-tight", children: "Revenue Overview" }),
                          e.jsx("span", {
                            className: "text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20",
                            children: "Live Flow"
                          })
                        ]
                      }),
                      e.jsx("p", {
                        className: "text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5",
                        children: "Real-time booking transactions across all corridors"
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      e.jsx("span", { className: "text-xs font-black text-slate-900 dark:text-white", children: "₹" + totalVolume.toLocaleString() }),
                      e.jsx("span", { className: "text-[10px] font-semibold text-slate-400", children: "Total" })
                    ]
                  })
                ]
              }),
              e.jsx("div", {
                className: "w-full transition-all duration-500 " + (chartData.length > 0 ? "h-[280px]" : "h-[220px] flex items-center justify-center border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl"),
                children: chartData.length > 0
                  ? e.jsx(R.Suspense, {
                      fallback: e.jsx("div", { className: "h-full w-full flex items-center justify-center text-slate-400 text-xs font-medium", children: "Loading chart..." }),
                      children: e.jsx(J, { data: chartData })
                    })
                  : e.jsxs("div", {
                      className: "text-center py-6",
                      children: [
                        e.jsx("div", {
                          className: "w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20",
                          children: e.jsx(IconTrend, { size: 24 })
                        }),
                        e.jsx("h4", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "Operational Pulse Synchronized" }),
                        e.jsx("p", { className: "text-xs text-slate-400 max-w-sm mx-auto mt-1", children: "Live booking data curves dynamically populate here as reservations stream through the engine." })
                      ]
                    })
              })
            ]
          }),

          /* Right (1 col): Circular Donut Orders Gauge */
          e.jsxs("div", {
            className: "lg:col-span-1 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between h-full min-h-[360px]",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsxs("div", {
                    className: "flex items-center justify-between mb-4",
                    children: [
                      e.jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white tracking-tight", children: "Orders & Confirmation" }),
                      e.jsx("span", {
                        className: "text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-500/20",
                        children: "Today"
                      })
                    ]
                  }),

                  /* SVG Donut Ring */
                  e.jsxs("div", {
                    className: "relative flex items-center justify-center my-6",
                    children: [
                      e.jsxs("svg", {
                        className: "w-44 h-44 -rotate-90",
                        viewBox: "0 0 120 120",
                        children: [
                          e.jsx("circle", { cx: "60", cy: "60", r: "48", stroke: "currentColor", strokeWidth: "10", className: "text-slate-100 dark:text-slate-800", fill: "none" }),
                          e.jsx("circle", {
                            cx: "60",
                            cy: "60",
                            r: "48",
                            stroke: "#2563eb",
                            strokeWidth: "10",
                            strokeDasharray: "301.6",
                            strokeDashoffset: todayOrders > 0 ? "60" : "120",
                            strokeLinecap: "round",
                            fill: "none",
                            className: "transition-all duration-1000 ease-out"
                          }),
                          e.jsx("circle", {
                            cx: "60",
                            cy: "60",
                            r: "48",
                            stroke: "#38bdf8",
                            strokeWidth: "10",
                            strokeDasharray: "301.6",
                            strokeDashoffset: todayOrders > 0 ? "240" : "280",
                            strokeLinecap: "round",
                            fill: "none",
                            className: "transition-all duration-1000 ease-out"
                          })
                        ]
                      }),
                      e.jsxs("div", {
                        className: "absolute text-center flex flex-col items-center justify-center",
                        children: [
                          e.jsx("span", { className: "text-3xl font-black text-slate-900 dark:text-white tracking-tight", children: todayOrders.toLocaleString() }),
                          e.jsx("span", { className: "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5", children: "Total Orders" })
                        ]
                      })
                    ]
                  }),

                  /* Breakdown Legend */
                  e.jsxs("div", {
                    className: "space-y-2.5 pt-2",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between text-xs font-semibold",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              e.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-600" }),
                              e.jsx("span", { className: "text-slate-700 dark:text-slate-300", children: "Confirmed (IRCTC)" })
                            ]
                          }),
                          e.jsx("span", { className: "text-slate-900 dark:text-white font-bold", children: "86%" })
                        ]
                      }),
                      e.jsxs("div", {
                        className: "flex items-center justify-between text-xs font-semibold",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              e.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-sky-400" }),
                              e.jsx("span", { className: "text-slate-700 dark:text-slate-300", children: "Tatkal Auto-Queue" })
                            ]
                          }),
                          e.jsx("span", { className: "text-slate-900 dark:text-white font-bold", children: "11%" })
                        ]
                      }),
                      e.jsxs("div", {
                        className: "flex items-center justify-between text-xs font-semibold",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              e.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" }),
                              e.jsx("span", { className: "text-slate-700 dark:text-slate-300", children: "Review / Processing" })
                            ]
                          }),
                          e.jsx("span", { className: "text-slate-900 dark:text-white font-bold", children: "3%" })
                        ]
                      })
                    ]
                  })
                ]
              }),
              e.jsx("div", {
                className: "mt-5 pt-3 border-t border-slate-100 dark:border-white/5",
                children: e.jsxs(k, {
                  to: "/manage-bookings",
                  className: "text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors",
                  children: [
                    e.jsx("span", { children: "View All Bookings" }),
                    e.jsx(IconArrowUpRight, { size: 14 })
                  ]
                })
              })
            ]
          })
        ]
      }),

      /* 4. Platform Operations & Command Nodes + Live Terminal & Wallet */
      e.jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start",
        children: [
          /* Left (2 cols): Command Nodes */
          e.jsxs("div", {
            className: "lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-5",
            children: [
              e.jsxs("div", {
                className: "flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center gap-3",
                    children: [
                      e.jsx("div", {
                        className: "w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shadow-sm",
                        children: e.jsx(IconZap, { size: 18 })
                      }),
                      e.jsxs("div", {
                        children: [
                          e.jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-white tracking-tight", children: "Platform Operations & Command Nodes" }),
                          e.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium", children: "Instant shortcuts and automated dispatch gateways" })
                        ]
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold",
                    children: [
                      e.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
                      e.jsx("span", { children: "All Gateways Active" })
                    ]
                  })
                ]
              }),

              /* 6 Action Tiles with High Contrast */
              e.jsxs("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5",
                children: [
                  /* Instant Booking */
                  e.jsxs(k, {
                    to: "/book-ticket",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-800/40 dark:hover:bg-blue-500/10 border border-slate-200/80 dark:border-white/5 hover:border-blue-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconPlus, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsx(IconArrowUpRight, { size: 14, className: "text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Instant Booking" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "IRCTC Tatkal & General" })
                    ]
                  }),

                  /* Failed Bookings */
                  e.jsxs(k, {
                    to: "/failed-bookings",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-rose-50/50 dark:bg-slate-800/40 dark:hover:bg-rose-500/10 border border-slate-200/80 dark:border-white/5 hover:border-rose-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconAlert, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsxs("span", {
                            className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20",
                            children: [(stats?.failedBookingCount || 0), " Pending"]
                          })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Failed Bookings" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "Urgent Intervention Terminal" })
                    ]
                  }),

                  /* Contact Inbox */
                  e.jsxs(k, {
                    to: "/inbox",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-800/40 dark:hover:bg-emerald-500/10 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconTerminal, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsx(IconArrowUpRight, { size: 14, className: "text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Contact Inbox" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "WhatsApp & Web Leads" })
                    ]
                  }),

                  /* Price Requests */
                  e.jsxs(k, {
                    to: "/price-requests",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/50 dark:bg-slate-800/40 dark:hover:bg-amber-500/10 border border-slate-200/80 dark:border-white/5 hover:border-amber-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconTrend, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsxs("span", {
                            className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20",
                            children: [(stats?.priceRequestCount || 0), " Review"]
                          })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Price Requests" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "Dynamic Custom Pricing" })
                    ]
                  }),

                  /* Dynamic Corridors */
                  e.jsxs(k, {
                    to: "/corridors",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/40 dark:hover:bg-indigo-500/10 border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconShield, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsx(IconArrowUpRight, { size: 14, className: "text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Dynamic Corridors" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "Route Margins & Rules" })
                    ]
                  }),

                  /* Manage Coupons */
                  e.jsxs(k, {
                    to: "/coupons",
                    className: "p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/50 dark:bg-slate-800/40 dark:hover:bg-teal-500/10 border border-slate-200/80 dark:border-white/5 hover:border-teal-500/40 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center justify-between mb-3",
                        children: [
                          e.jsx("div", {
                            className: "w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform",
                            children: e.jsx(IconCheck, { size: 16, strokeWidth: 2.5 })
                          }),
                          e.jsx(IconArrowUpRight, { size: 14, className: "text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" })
                        ]
                      }),
                      e.jsx("h3", { className: "text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight", children: "Manage Coupons" }),
                      e.jsx("p", { className: "text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5", children: "Discounts & Promos" })
                    ]
                  })
                ]
              }),

              /* Gateway Status Pulse Bar */
              e.jsxs("div", {
                className: "pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2.5",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5",
                    children: [
                      e.jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" }),
                      e.jsxs("div", {
                        className: "min-w-0",
                        children: [
                          e.jsx("p", { className: "text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate", children: "Core Rail API" }),
                          e.jsx("p", { className: "text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase", children: "Render Online" })
                        ]
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5",
                    children: [
                      e.jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" }),
                      e.jsxs("div", {
                        className: "min-w-0",
                        children: [
                          e.jsx("p", { className: "text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate", children: "IRCTC Engine" }),
                          e.jsx("p", { className: "text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase", children: "RailKit Active" })
                        ]
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5",
                    children: [
                      e.jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" }),
                      e.jsxs("div", {
                        className: "min-w-0",
                        children: [
                          e.jsx("p", { className: "text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate", children: "WhatsApp Node" }),
                          e.jsx("p", { className: "text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase", children: "WhatsGateway" })
                        ]
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5",
                    children: [
                      e.jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" }),
                      e.jsxs("div", {
                        className: "min-w-0",
                        children: [
                          e.jsx("p", { className: "text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate", children: "TextBee SMS" }),
                          e.jsx("p", { className: "text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase", children: "Airtel Dedicated" })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          /* Right (1 col): WalletCard & Live Terminal Feed */
          e.jsxs("div", {
            className: "lg:col-span-1 space-y-6",
            children: [
              e.jsx(M, {}),

              e.jsxs("div", {
                className: "bg-white dark:bg-slate-900/90 rounded-[1.75rem] p-6 border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col min-h-[380px]",
                children: [
                  e.jsxs("div", {
                    className: "flex items-center justify-between mb-5",
                    children: [
                      e.jsxs("div", {
                        children: [
                          e.jsxs("h2", {
                            className: "text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2",
                            children: [
                              e.jsx(IconClock, { size: 16, className: "text-blue-600" }),
                              "Recent Activity"
                            ]
                          }),
                          e.jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-medium", children: "Live Terminal Stream" })
                        ]
                      }),
                      e.jsx("div", { className: "h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" })
                    ]
                  }),

                  e.jsx("div", {
                    className: "flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 max-h-[320px]",
                    children: loadingActivities
                      ? [1, 2, 3, 4].map((_, i) =>
                          e.jsx("div", {
                            key: i,
                            className: "h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse"
                          })
                        )
                      : activities.length > 0
                      ? activities.map((activity) =>
                          e.jsxs("div", {
                            key: activity.id,
                            className: "flex gap-3 p-2.5 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group",
                            children: [
                              e.jsx("div", {
                                className: "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm " + (activity.type === "BOOKING" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"),
                                children: activity.type === "BOOKING" ? e.jsx(IconBag, { size: 16 }) : e.jsx(IconTerminal, { size: 16 })
                              }),
                              e.jsxs("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex items-center justify-between gap-1 mb-0.5",
                                    children: [
                                      e.jsx("p", { className: "text-xs font-bold text-slate-900 dark:text-white truncate", children: activity.user }),
                                      e.jsx("span", {
                                        className: "text-[10px] text-slate-400 font-medium shrink-0",
                                        children: new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                      })
                                    ]
                                  }),
                                  e.jsx("p", {
                                    className: "text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium",
                                    children: (activity.details || activity.action || "").replace(/Pushed OTA update to version/gi, "Synchronized core version")
                                  })
                                ]
                              })
                            ]
                          })
                        )
                      : e.jsxs("div", {
                          className: "py-8 text-center flex flex-col items-center justify-center gap-2",
                          children: [
                            e.jsx(IconActivity, { size: 24, className: "text-slate-300 dark:text-slate-600" }),
                            e.jsx("p", { className: "text-xs font-semibold text-slate-400", children: "No Recent Activity Signals" })
                          ]
                        })
                  }),

                  e.jsx("div", {
                    className: "mt-4 pt-3 border-t border-slate-100 dark:border-white/5",
                    children: e.jsxs(k, {
                      to: "/manage-bookings",
                      className: "text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors",
                      children: [
                        e.jsx("span", { children: "View Full Operations Logs" }),
                        e.jsx(IconChevronRight, { size: 14 })
                      ]
                    })
                  })
                ]
              })
            ]
          })
        ]
      }),

      /* 5. Semantic Footer */
      e.jsxs("footer", {
        role: "contentinfo",
        className: "w-full pt-8 pb-4 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4",
        children: [
          e.jsx("p", { children: "© 2026 Tickets Pro. Smart Rail Intelligence & Automated Booking." }),
          e.jsxs("nav", {
            "aria-label": "Footer Site Links",
            className: "flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider",
            children: [
              e.jsx(k, { to: "/about", className: "hover:text-blue-600 transition-colors", children: "About Us" }),
              e.jsx(k, { to: "/contact", className: "hover:text-blue-600 transition-colors", children: "Contact Support" }),
              e.jsx(k, { to: "/pricing", className: "hover:text-blue-600 transition-colors", children: "Pricing" }),
              e.jsx(k, { to: "/travel-guide", className: "hover:text-blue-600 transition-colors", children: "Travel Guide & FAQ" }),
              e.jsx(k, { to: "/terms", className: "hover:text-blue-600 transition-colors", children: "Terms & Conditions" }),
              e.jsx(k, { to: "/privacy", className: "hover:text-blue-600 transition-colors", children: "Privacy Policy" }),
              e.jsx(k, { to: "/refund-policy", className: "hover:text-blue-600 transition-colors", children: "Refund Policy" })
            ]
          })
        ]
      })
    ]
  });
}

export { DashboardHome as default };

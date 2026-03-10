import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { PriceAction, PriceFilter, ScheduledChange } from "@/types";
import { Clock, Plus, Trash2, AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Lock, Pencil } from "lucide-react";
import { calculateNewPrice, formatDate } from "@lib/price-utils";
import { resolveShop } from "@lib/use-shop";
import { DEMO_SHOP } from "@lib/mock-data";

const SALE_DISCOUNT_PRESETS = [10, 15, 20, 25];

function parseMultiValueInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export default function ScheduledPage() {
  const router = useRouter();
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [planType, setPlanType] = useState<"starter" | "premium">("starter");
  const [usageLabel, setUsageLabel] = useState<string>("--");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [taskInput, setTaskInput] = useState("");
  const [premiumTasks, setPremiumTasks] = useState<string[]>([]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    autoRevert: true,
  });

  const [ruleType, setRuleType] = useState<PriceAction["type"]>("percentage_decrease");
  const [ruleValue, setRuleValue] = useState<number>(20);
  const [roundTo, setRoundTo] = useState<".99" | ".95" | ".00">(".99");
  const [marginProtectionEnabled, setMarginProtectionEnabled] = useState(false);
  const [marginProtectionMode, setMarginProtectionMode] = useState<
    "fixed_minimum" | "cost_plus_percentage" | "cost_plus_fixed"
  >("fixed_minimum");
  const [marginProtectionValue, setMarginProtectionValue] = useState<number>(10);

  const [collectionInput, setCollectionInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [collectionOptions, setCollectionOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [productTypeInput, setProductTypeInput] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived" | "">("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(300);
  const [inventoryMin, setInventoryMin] = useState(0);
  const [inventoryMax, setInventoryMax] = useState(500);

  const [impact, setImpact] = useState({
    affectedCount: 0,
    estimatedOperations: 0,
    averageChangePercent: 0,
    lowestPrice: 0,
    highestPrice: 0,
    estimatedRevenueImpact: 0,
    belowCostCount: 0,
    loaded: false,
  });

  useEffect(() => {
    runScheduledChanges();
    fetchScheduledChanges();
    fetchPlanUsage();
    fetchTargetOptions();

    const interval = setInterval(() => {
      runScheduledChanges();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const newParam = router.query.new;
    const createParam = router.query.create;
    const wantsCreate =
      newParam === "1" ||
      newParam === "true" ||
      createParam === "1" ||
      createParam === "true";

    if (wantsCreate) {
      setEditingScheduleId(null);
      setShowForm(true);
    }
  }, [router.isReady, router.query.new, router.query.create]);

  const getCurrentShop = () => resolveShop();

  const fetchPlanUsage = async () => {
    try {
      const shop = getCurrentShop();
      if (!shop) return;

      if (shop === DEMO_SHOP) {
        setPlanType("starter");
        setUsageLabel("Demo mode – mock calendar preview");
        setPremiumTasks([]);
        return;
      }

      const response = await axios.get(`/api/plan-usage?shop=${encodeURIComponent(shop)}`);
      if (response.data?.success) {
        setPlanType(response.data.data.plan === "premium" ? "premium" : "starter");
        setUsageLabel(response.data.data.label || "--");

        if (typeof window !== "undefined") {
          const taskKey = `premium-calendar-tasks:${shop}`;
          const savedTasks = localStorage.getItem(taskKey);
          if (savedTasks) {
            setPremiumTasks(JSON.parse(savedTasks));
          }
        }
      }
    } catch {
      setPlanType("starter");
      setUsageLabel("--");
    }
  };

  const fetchTargetOptions = async () => {
    try {
      const shop = getCurrentShop();
      if (!shop) return;

      const response = await axios.get(`/api/products?limit=250&offset=0&shop=${encodeURIComponent(shop)}`);
      const products = response.data?.data?.products || [];

      const collections = new Set<string>();
      const vendors = new Set<string>();

      for (const product of products) {
        if (product?.vendor) {
          vendors.add(String(product.vendor).trim());
        }

        const rawCollections = product?.collections;
        if (Array.isArray(rawCollections)) {
          rawCollections
            .map((value) => String(value).trim())
            .filter(Boolean)
            .forEach((value) => collections.add(value));
        } else if (typeof rawCollections === "string") {
          rawCollections
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .forEach((value) => collections.add(value));
        }
      }

      setCollectionOptions(Array.from(collections).sort((a, b) => a.localeCompare(b)));
      setVendorOptions(Array.from(vendors).sort((a, b) => a.localeCompare(b)));
    } catch {
      setCollectionOptions([]);
      setVendorOptions([]);
    }
  };

  const isPremium = planType === "premium";
  const canManageSchedules = isPremium || getCurrentShop() === DEMO_SHOP;

  const addPremiumTask = () => {
    if (!isPremium) {
      toast.error("Upgrade to premium to add scheduling tasks");
      return;
    }

    const task = taskInput.trim();
    if (!task) return;

    const nextTasks = [task, ...premiumTasks].slice(0, 10);
    setPremiumTasks(nextTasks);
    setTaskInput("");

    const shop = getCurrentShop();
    if (shop && typeof window !== "undefined") {
      localStorage.setItem(`premium-calendar-tasks:${shop}`, JSON.stringify(nextTasks));
    }
  };

  const fetchScheduledChanges = async () => {
    try {
      const shop = getCurrentShop();
      if (!shop) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`/api/scheduled-changes?status=all&shop=${encodeURIComponent(shop)}`);
      if (response.data.success) {
        setChanges(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled changes:", error);
      toast.error("Failed to load scheduled changes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled change?")) {
      return;
    }

    try {
      const shop = getCurrentShop();
      const response = await axios.delete(`/api/scheduled-changes?id=${id}&shop=${encodeURIComponent(shop)}`);
      if (response.data.success) {
        setChanges(changes.filter((c) => c.id !== id));
        toast.success("Scheduled change deleted");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete");
    }
  };

  const runScheduledChanges = async () => {
    try {
      const shop = getCurrentShop();
      if (!shop) return;

      const response = await axios.post("/api/run-scheduled", { shop });
      if (response.data?.success) {
        const { appliedSchedules, revertedSchedules } = response.data.data || {};
        if ((appliedSchedules || 0) > 0 || (revertedSchedules || 0) > 0) {
          fetchScheduledChanges();
        }
      }
    } catch {
      // silent: background runner
    }
  };

  const startEditing = (change: ScheduledChange) => {
    setEditingScheduleId(change.id);
    setShowForm(true);

    const action = change.action;

    setFormData({
      name: change.name,
      description: change.description || "",
      startTime: change.startTime ? new Date(change.startTime).toISOString().slice(0, 16) : "",
      endTime: change.endTime ? new Date(change.endTime).toISOString().slice(0, 16) : "",
      autoRevert: Boolean(change.autoRevert),
    });

    setRuleType(action.type);
    setRuleValue(action.value || 0);
    setRoundTo(action.roundTo || ".99");
    setMarginProtectionEnabled(Boolean(action.marginProtection?.enabled));
    setMarginProtectionMode(action.marginProtection?.mode || "fixed_minimum");
    setMarginProtectionValue(action.marginProtection?.value || 10);

    setCollectionInput((change.filters.collections || []).join(", "));
    setVendorInput((change.filters.vendors || []).join(", "));
    setProductTypeInput((change.filters.productTypes || []).join(", "));
    setStatus((change.filters.statuses?.[0] as "active" | "draft" | "archived" | "") || "");
    setPriceMin(change.filters.priceRange?.min || 0);
    setPriceMax(change.filters.priceRange?.max || 300);
    setInventoryMin(change.filters.inventoryRange?.min || 0);
    setInventoryMax(change.filters.inventoryRange?.max || 500);
  };

  const handleSaveForm = async () => {
    if (!canManageSchedules) {
      toast.error("Upgrade to premium to pre-schedule sales");
      return;
    }

    if (!formData.name || !formData.startTime) {
      toast.error("Name and start time are required");
      return;
    }

    if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

    const filters = buildFilters();
    const action = buildAction();
    const shop = getCurrentShop();

    try {
      const payload = {
        ...formData,
        filters,
        action,
        shop,
      };

      const response = editingScheduleId
        ? await axios.put("/api/scheduled-changes", { ...payload, id: editingScheduleId })
        : await axios.post("/api/scheduled-changes", payload);

      if (response.data.success) {
        toast.success(editingScheduleId ? "Scheduled change updated" : "Scheduled change created");
        setShowForm(false);
        setEditingScheduleId(null);
        setFormData({
          name: "",
          description: "",
          startTime: "",
          endTime: "",
          autoRevert: true,
        });
        setRuleType("percentage_decrease");
        setRuleValue(20);
        setRoundTo(".99");
        setMarginProtectionEnabled(false);
        setMarginProtectionMode("fixed_minimum");
        setMarginProtectionValue(10);
        setCollectionInput("");
        setVendorInput("");
        setProductTypeInput("");
        setStatus("");
        setPriceMin(0);
        setPriceMax(300);
        setInventoryMin(0);
        setInventoryMax(500);
        setImpact({
          affectedCount: 0,
          estimatedOperations: 0,
          averageChangePercent: 0,
          lowestPrice: 0,
          highestPrice: 0,
          estimatedRevenueImpact: 0,
          belowCostCount: 0,
          loaded: false,
        });
        fetchScheduledChanges();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create scheduled change");
    }
  };

  const buildFilters = (): PriceFilter => {
    const filters: PriceFilter = {};

    const selectedCollections = parseMultiValueInput(collectionInput);
    const selectedVendors = parseMultiValueInput(vendorInput);
    const selectedProductTypes = parseMultiValueInput(productTypeInput);

    if (selectedCollections.length) {
      filters.collections = selectedCollections;
    }
    if (selectedVendors.length) {
      filters.vendors = selectedVendors;
    }
    if (selectedProductTypes.length) {
      filters.productTypes = selectedProductTypes;
    }
    if (status) {
      filters.statuses = [status];
    }
    if (priceMin > 0 || priceMax < 300) {
      filters.priceRange = { min: priceMin, max: priceMax };
    }
    if (inventoryMin > 0 || inventoryMax < 500) {
      filters.inventoryRange = { min: inventoryMin, max: inventoryMax };
    }

    return filters;
  };

  const buildAction = (): PriceAction => {
    if (ruleType === "round") {
      return {
        type: ruleType,
        roundTo,
        marginProtection: {
          enabled: marginProtectionEnabled,
          mode: marginProtectionMode,
          value: marginProtectionValue,
        },
      };
    }

    return {
      type: ruleType,
      value: ruleValue,
      marginProtection: {
        enabled: marginProtectionEnabled,
        mode: marginProtectionMode,
        value: marginProtectionValue,
      },
    };
  };

  const calculateImpact = async () => {
    const filters = buildFilters();
    const action = buildAction();
    const shop = getCurrentShop();

    if (!shop) {
      toast.error("Install on Shopify to start");
      return;
    }

    try {
      const [countResponse, previewResponse] = await Promise.all([
        axios.post("/api/preview-count", { filters, shop }),
        axios.post("/api/preview-prices", { filters, action, shop }),
      ]);

      const count = countResponse.data?.data?.count || 0;
      const previewRows = previewResponse.data?.data?.preview || [];
      const averageChangePercent =
        previewRows.length > 0
          ? previewRows.reduce((sum: number, row: any) => sum + (row.change || 0), 0) / previewRows.length
          : 0;
      const lowestPrice =
        previewRows.length > 0
          ? Math.min(...previewRows.map((row: any) => Number(row.newPrice || 0)))
          : 0;
      const highestPrice =
        previewRows.length > 0
          ? Math.max(...previewRows.map((row: any) => Number(row.newPrice || 0)))
          : 0;
      const estimatedRevenueImpact =
        previewRows.length > 0
          ? previewRows.reduce((sum: number, row: any) => sum + (Number(row.newPrice || 0) - Number(row.oldPrice || 0)), 0)
          : 0;
      const belowCostCount =
        previewRows.length > 0
          ? previewRows.filter((row: any) => row.wasProtected).length
          : 0;

      setImpact({
        affectedCount: count,
        estimatedOperations: count,
        averageChangePercent,
        lowestPrice,
        highestPrice,
        estimatedRevenueImpact,
        belowCostCount,
        loaded: true,
      });
    } catch (error) {
      toast.error("Failed to calculate impact preview");
      setImpact({
        affectedCount: 0,
        estimatedOperations: 0,
        averageChangePercent: 0,
        lowestPrice: 0,
        highestPrice: 0,
        estimatedRevenueImpact: 0,
        belowCostCount: 0,
        loaded: true,
      });
    }
  };

  const samplePreview = calculateNewPrice(50, buildAction());

  const applyPercentageSalePreset = (percent: number) => {
    setRuleType("percentage_decrease");
    setRuleValue(percent);

    if (!formData.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        name: `${percent}% Off Sale`,
      }));
    }
  };

  const goPrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getHolidayLabel = (year: number, month: number, day: number) => {
    const key = `${month + 1}-${day}`;
    const fixedHolidays: Record<string, string> = {
      "1-1": "New Year",
      "2-14": "Valentine's Day",
      "7-4": "Independence Day",
      "10-31": "Halloween",
      "11-11": "Veterans Day",
      "12-24": "Christmas Eve",
      "12-25": "Christmas",
      "12-31": "New Year's Eve",
    };

    if (fixedHolidays[key]) {
      return fixedHolidays[key];
    }

    if (month === 10) {
      const firstDay = new Date(year, 10, 1);
      const firstThursdayOffset = (4 - firstDay.getDay() + 7) % 7;
      const thanksgivingDay = 1 + firstThursdayOffset + 21;
      if (day === thanksgivingDay) {
        return "Thanksgiving";
      }
    }

    return null;
  };

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarEventsByDay = useMemo(() => {
    const events = new Map<number, ScheduledChange[]>();

    for (const change of changes) {
      if (!change.startTime) continue;
      const date = new Date(change.startTime);
      if (date.getFullYear() !== calendarYear || date.getMonth() !== calendarMonthIndex) continue;

      const day = date.getDate();
      const existing = events.get(day) || [];
      existing.push(change);
      events.set(day, existing);
    }

    return events;
  }, [changes, calendarYear, calendarMonthIndex]);

  const mockPromoStart = new Date();
  mockPromoStart.setHours(0, 0, 0, 0);
  const mockPromoEnd = new Date(mockPromoStart);
  mockPromoEnd.setDate(mockPromoEnd.getDate() + 13);
  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDayOfMonth + 1;
    if (day < 1 || day > daysInMonth) {
      return null;
    }

    return {
      day,
      holiday: getHolidayLabel(calendarYear, calendarMonthIndex, day),
      isMockPromo:
        !isPremium &&
        (() => {
          const date = new Date(calendarYear, calendarMonthIndex, day);
          date.setHours(0, 0, 0, 0);
          return date >= mockPromoStart && date <= mockPromoEnd;
        })(),
    };
  });

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      scheduled: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
          statusStyles[status as keyof typeof statusStyles]
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto dashboard-wrapper space-y-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="section-title font-bold text-gray-900 mb-2">
            Sale Calendar
          </h1>
          <p className="body-compact text-gray-600">
            Plan and run calendar-based promotions for your store
          </p>
        </div>
        <button
          onClick={() => {
            if (!canManageSchedules) {
              toast.error("Upgrade to premium to pre-schedule sales, add tasks, and use calendar planning");
              return;
            }
            setShowForm(!showForm);
          }}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{canManageSchedules ? "Add Calendar Sale" : "Upgrade to Premium"}</span>
        </button>
      </div>

      {!isPremium && (
        <div className="mb-6 section-card bg-white/85 border border-blue-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="icon-pill">
                  <Lock className="w-5 h-5 text-blue-700" />
                </div>
                <h3 className="section-title font-bold text-gray-900">Unlock Scheduled Sales & Automation</h3>
              </div>
              <p className="body-compact text-gray-700 mb-3">
                Create, edit, and automate price changes with calendar scheduling, task tracking, and smart campaigns. 
                <span className="inline-block ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Preview below</span>
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold whitespace-nowrap">
              {usageLabel}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8">
        <div className="section-card bg-white/85 border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={goPrevMonth}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="section-title font-bold text-gray-900">
              {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={goNextMonth}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 mb-2">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((weekday) => (
              <div key={weekday} className="py-2 text-center">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => (
              <div
                key={index}
                className={`min-h-[68px] border rounded-lg p-2 transition-all ${
                  cell
                    ? "border-gray-200 bg-white/90 hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer"
                    : "border-transparent"
                }`}
              >
                {cell && (
                  <>
                    <div className="text-xs font-semibold text-gray-700 mb-1">{cell.day}</div>
                    {(() => {
                      const dayEvents = calendarEventsByDay.get(cell.day) || [];
                      if (dayEvents.length === 0) return null;

                      return (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="text-[10px] font-medium leading-tight text-indigo-700 bg-indigo-100 rounded-full px-2 py-1 truncate"
                              title={`${event.name} • ${formatDate(event.startTime, "long")}`}
                            >
                              {event.name}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] leading-tight text-indigo-700 px-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {cell.isMockPromo && (
                      <div className="text-[10px] font-medium leading-tight text-blue-700 bg-blue-100 rounded-full px-2 py-1 inline-block">
                        🌸 Spring Sale
                      </div>
                    )}
                    {cell.holiday && (
                      <div className="text-[10px] leading-tight text-red-600 bg-red-50 rounded-full px-2 py-1 inline-block mt-1">
                        {cell.holiday}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="section-card bg-white/85 border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-pill">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="card-title font-bold text-gray-900">Calendar Tasks</h3>
          </div>
          <p className="body-compact text-gray-600 mb-4">Prepare upcoming promotions</p>

          <div className="flex gap-2 mb-4">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPremiumTask()}
              placeholder={isPremium ? "e.g., Build promo list..." : "Upgrade to add tasks"}
              disabled={!isPremium}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addPremiumTask}
              disabled={!isPremium}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {premiumTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-gray-500 font-medium">No tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first task</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {premiumTasks.map((task, index) => (
                <li key={`${task}-${index}`} className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                  {task}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Form */}
      {showForm && (
        <div className="section-card bg-white/85 border border-gray-200 rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-6">
            {["Campaign details", "Select products", "Set pricing rule", "Schedule", "Preview"].map((step, index) => (
              <div key={step} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-6">
              <section className="action-card section-card">
                <h3 className="section-title font-semibold text-gray-900 mb-4">Campaign Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Black Friday Sale"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section className="action-card section-card">
                <h3 className="section-title font-semibold text-gray-900 mb-4">Pricing Rule</h3>

                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Quick Sale by Percentage</p>
                  <div className="flex flex-wrap gap-2">
                    {SALE_DISCOUNT_PRESETS.map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => applyPercentageSalePreset(percent)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          ruleType === "percentage_decrease" && Number(ruleValue) === percent
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                      >
                        {percent}% OFF
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-800 mt-2">
                    Example: choose <strong>15% OFF</strong>, then set your sale start and end dates below.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rule Type</label>
                    <select
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value as PriceAction["type"])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="percentage_decrease">Sale discount by %</option>
                      <option value="percentage_increase">Increase price by %</option>
                      <option value="fixed_decrease">Decrease by fixed amount</option>
                      <option value="fixed_increase">Increase by fixed amount</option>
                      <option value="exact">Set exact price</option>
                      <option value="round">Round price endings</option>
                    </select>
                  </div>

                  {ruleType === "round" ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Rounding Preset</label>
                      <select
                        value={roundTo}
                        onChange={(e) => setRoundTo(e.target.value as ".99" | ".95" | ".00")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value=".99">Round to .99</option>
                        <option value=".95">Round to .95</option>
                        <option value=".00">Round to .00</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {ruleType === "percentage_decrease" ? "Discount Percentage" : "Value"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={ruleValue}
                          onChange={(e) => setRuleValue(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-sm text-gray-600">{ruleType.includes("percentage") ? "%" : "$"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Preview: $50.00 → ${samplePreview.toFixed(2)}
                </div>

                <div className="mt-4 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={marginProtectionEnabled}
                      onChange={(e) => setMarginProtectionEnabled(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Prevent prices below protected floor</span>
                  </label>

                  {marginProtectionEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Protection Mode</label>
                        <select
                          value={marginProtectionMode}
                          onChange={(e) =>
                            setMarginProtectionMode(
                              e.target.value as "fixed_minimum" | "cost_plus_percentage" | "cost_plus_fixed"
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="fixed_minimum">Minimum fixed price</option>
                          <option value="cost_plus_percentage">Cost + percentage margin</option>
                          <option value="cost_plus_fixed">Cost + fixed amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Value</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={marginProtectionValue}
                            onChange={(e) => setMarginProtectionValue(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span className="text-sm text-gray-600">
                            {marginProtectionMode === "cost_plus_percentage" ? "%" : "$"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="action-card section-card">
                <h3 className="section-title font-semibold text-gray-900 mb-4">Target Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Collection</label>
                    <input
                      value={collectionInput}
                      onChange={(e) => setCollectionInput(e.target.value)}
                      placeholder="Summer Collection, Electronics, Winter Collection"
                      list="collection-options"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <datalist id="collection-options">
                      {collectionOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">Add multiple with commas.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor</label>
                    <input
                      value={vendorInput}
                      onChange={(e) => setVendorInput(e.target.value)}
                      placeholder="Nike, Adidas, Puma"
                      list="vendor-options"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <datalist id="vendor-options">
                      {vendorOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">Add multiple with commas.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Type</label>
                    <input
                      value={productTypeInput}
                      onChange={(e) => setProductTypeInput(e.target.value)}
                      placeholder="Shoes, Accessories"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Add multiple with commas.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "draft" | "archived" | "")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Any status</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      <span className="text-gray-500">-</span>
                      <input type="number" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Inventory Range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={inventoryMin} onChange={(e) => setInventoryMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      <span className="text-gray-500">-</span>
                      <input type="number" value={inventoryMax} onChange={(e) => setInventoryMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="action-card section-card">
                <h3 className="section-title font-semibold text-gray-900 mb-4">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sale End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <p className="text-xs text-blue-700 mt-3">
                  Set a date range to run a timed sale (for example: 15% off from Friday 9:00 AM to Sunday 11:59 PM).
                </p>

                <p className="text-xs text-gray-700 mt-2">
                  For April 5 at 8:00 PM Pacific time, use <strong>2026-04-05 20:00</strong> while your device timezone is
                  <strong> America/Los_Angeles</strong>.
                </p>

                <p className="text-xs text-gray-500 mt-3">Timezone: {timezone} (store timezone recommended)</p>

                <label className="flex items-center space-x-3 mt-4">
                  <input
                    type="checkbox"
                    checked={formData.autoRevert}
                    onChange={(e) => setFormData({ ...formData, autoRevert: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-700 font-medium">Restore original prices after end</span>
                </label>
              </section>

              <section className="action-card section-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title font-semibold text-gray-900">Sale Impact Preview</h3>
                  <button
                    onClick={calculateImpact}
                    className="btn-primary text-sm"
                  >
                    Calculate Impact
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Products affected</p>
                    <p className="text-xl font-semibold text-gray-900">{impact.affectedCount}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Estimated API operations</p>
                    <p className="text-xl font-semibold text-gray-900">{impact.estimatedOperations}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Average discount</p>
                    <p className={`text-xl font-semibold ${impact.averageChangePercent <= 0 ? "text-green-600" : "text-red-600"}`}>
                      {impact.averageChangePercent > 0 ? "+" : ""}
                      {impact.averageChangePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Lowest price after change</p>
                    <p className="text-xl font-semibold text-gray-900">${impact.lowestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Highest price after change</p>
                    <p className="text-xl font-semibold text-gray-900">${impact.highestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Estimated revenue impact</p>
                    <p className={`text-xl font-semibold ${impact.estimatedRevenueImpact <= 0 ? "text-red-600" : "text-green-600"}`}>
                      {impact.estimatedRevenueImpact > 0 ? "+" : ""}${impact.estimatedRevenueImpact.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Products adjusted by margin protection: <span className="font-semibold">{impact.belowCostCount}</span>
                </div>

                {!impact.loaded && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">Calculate impact to preview products affected and estimated operations before scheduling.</p>
                  </div>
                )}
              </section>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingScheduleId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveForm}
                  className="flex-1 btn-primary"
                >
                  {editingScheduleId ? "Update Schedule" : "Create Schedule"}
                </button>
              </div>
            </div>

            <aside className="section-card bg-white/90 border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
              <h3 className="section-title font-semibold text-gray-900 mb-4">Campaign Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="text-gray-900 font-medium">{formData.name || "Untitled campaign"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Products</p>
                  <p className="text-gray-900 font-medium">{impact.affectedCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Rule</p>
                  <p className="text-gray-900 font-medium">
                    {ruleType === "round"
                      ? `Round to ${roundTo}`
                      : `${ruleType.includes("decrease") ? "-" : "+"}${ruleValue}${ruleType.includes("percentage") ? "%" : "$"}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Protection</p>
                  <p className="text-gray-900 font-medium">
                    {marginProtectionEnabled
                      ? marginProtectionMode === "fixed_minimum"
                        ? `Min $${marginProtectionValue}`
                        : marginProtectionMode === "cost_plus_percentage"
                        ? `Cost + ${marginProtectionValue}%`
                        : `Cost + $${marginProtectionValue}`
                      : "Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="text-gray-900 font-medium">{formData.startTime ? formatDate(formData.startTime, "long") : "Not set"}</p>
                </div>
                <div>
                  <p className="text-gray-500">End</p>
                  <p className="text-gray-900 font-medium">{formData.endTime ? formatDate(formData.endTime, "long") : "Not set"}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* List */}
      <div className="section-card bg-white/85 border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-8 py-12 text-center text-gray-500">Loading...</div>
        ) : changes.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No scheduled sales yet</h3>
            <p className="text-gray-500 mb-6">Start planning your first calendar promotion</p>
            <button
              onClick={() => {
                if (!canManageSchedules) {
                  toast.error("Upgrade to premium to pre-schedule sales, add tasks, and use calendar planning");
                  return;
                }
                setShowForm(true);
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Schedule your first sale
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {changes.map((change) => (
              <div
                key={change.id}
                className="p-6 hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {change.name}
                    </h3>
                    {change.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {change.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(change.status)}
                    <button
                      onClick={() => startEditing(change)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit schedule"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(change.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-semibold mb-1">Start Time</p>
                    <p className="text-gray-900">
                      {formatDate(change.startTime, "long")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold mb-1">End Time</p>
                    <p className="text-gray-900">
                      {change.endTime
                        ? formatDate(change.endTime, "long")
                        : "No end time"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold mb-1">Auto Revert</p>
                    <p className="text-gray-900">
                      {change.autoRevert ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

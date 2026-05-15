"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { loadProducts } from "@/lib/mock-loader";

const SEGMENT_LABELS: Record<string, string> = {
  executive: "Executive",
  operations: "Operations",
  products: "Risky Products",
  recommendations: "Recommendations",
  tasks: "Tasks",
  "my-tasks": "My Tasks",
  transfers: "Transfers",
  discounts: "Discounts",
  analytics: "Analytics",
  "data-quality": "Data Quality",
  "whatif-lab": "What-If Lab",
  notifications: "Notifications",
  "audit-log": "Audit Log",
  settings: "Settings",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const [productMap, setProductMap] = useState<Record<string, string>>({});
  const segments = pathname.split("/").filter(Boolean);

  useEffect(() => {
    if (segments[0] !== "products" || !segments[1]) return;
    let cancelled = false;
    loadProducts().then((products) => {
      if (cancelled) return;
      setProductMap(Object.fromEntries(products.map((p) => [p.id, p.name])));
    });
    return () => {
      cancelled = true;
    };
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;
          const isEntityId = idx > 0 && segments[0] === "products" && idx === 1;
          const label = isEntityId
            ? productMap[seg] ?? seg
            : SEGMENT_LABELS[seg] ?? seg;
          return (
            <span key={href} className="flex items-center gap-1.5">
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="max-w-[200px] truncate">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

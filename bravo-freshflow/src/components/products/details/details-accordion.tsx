"use client";

import {
  Boxes,
  Brain,
  CalendarClock,
  CalendarDays,
  Coins,
  Gauge,
  MapPin,
  Package,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RiskBadge } from "@/components/badges/risk-badge";
import { cn } from "@/lib/utils";
import {
  ActiveBatchesSection,
  BranchStockSection,
  DatesSection,
  FinancialsSection,
  ProductInfoSection,
} from "./column-one";
import { RiskBreakdownCard } from "./risk-breakdown-card";
import { ExpiryTimelineCard } from "./expiry-timeline-card";
import { DataConfidenceCard } from "./data-confidence-card";
import type { ProductDetailsBundle } from "./details-data";

interface Props {
  bundle: ProductDetailsBundle;
  defaultOpen?: string[];
}

export function DetailsAccordion({ bundle, defaultOpen = [] }: Props) {
  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen}
      className="w-full space-y-2"
    >
      <Section value="product-info" icon={<Package className="size-4" />} label="Product Info">
        <ProductInfoSection
          product={bundle.product}
          category={bundle.category}
          supplier={bundle.supplier}
        />
      </Section>

      {bundle.prediction ? (
        <Section
          value="risk-breakdown"
          icon={<Brain className="size-4" />}
          label="Risk Score Breakdown"
          right={<RiskBadge level={bundle.prediction.risk_level} />}
        >
          <RiskBreakdownCard prediction={bundle.prediction} headless />
        </Section>
      ) : null}

      <Section value="branch-stock" icon={<MapPin className="size-4" />} label="Branch & Stock">
        <BranchStockSection
          store={bundle.store}
          prediction={bundle.prediction}
          snapshots={bundle.snapshots}
        />
      </Section>

      {bundle.prediction ? (
        <Section
          value="expiry-timeline"
          icon={<CalendarClock className="size-4" />}
          label="Expiry Timeline"
        >
          <ExpiryTimelineCard prediction={bundle.prediction} headless />
        </Section>
      ) : null}

      {bundle.prediction ? (
        <Section
          value="data-confidence"
          icon={<Gauge className="size-4" />}
          label="Data Confidence"
        >
          <DataConfidenceCard
            prediction={bundle.prediction}
            snapshots={bundle.snapshots}
            batches={bundle.activeBatches}
            sales={bundle.sales}
            headless
          />
        </Section>
      ) : null}

      <Section value="financials" icon={<Coins className="size-4" />} label="Financials">
        <FinancialsSection product={bundle.product} prediction={bundle.prediction} />
      </Section>

      <Section value="dates" icon={<CalendarDays className="size-4" />} label="Dates">
        <DatesSection prediction={bundle.prediction} batches={bundle.activeBatches} />
      </Section>

      <Section
        value="active-batches"
        icon={<Boxes className="size-4" />}
        label="Active Batches"
        count={bundle.activeBatches.length}
      >
        <ActiveBatchesSection batches={bundle.activeBatches} />
      </Section>
    </Accordion>
  );
}

function Section({
  value,
  icon,
  label,
  count,
  right,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className={cn(
        "overflow-hidden rounded-md border-0 bg-card shadow-sm",
        "data-[state=open]:shadow-md"
      )}
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full items-center gap-2 pr-2">
          <span className="text-muted-foreground" aria-hidden>
            {icon}
          </span>
          <span className="text-sm font-semibold">{label}</span>
          {count !== undefined ? (
            <span className="text-xs font-normal text-muted-foreground">({count})</span>
          ) : null}
          {right ? <span className="ml-auto">{right}</span> : null}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

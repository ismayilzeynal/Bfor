import type {
  DataQualityIssue,
  DataQualityIssueType,
  DataQualityStatus,
  Product,
  Store,
} from "@/types";
import type { IssueOverride } from "@/store/actions-store";

export interface IssueRow {
  issue: DataQualityIssue;
  override?: IssueOverride;
  effectiveStatus: DataQualityStatus;
  effectiveResolvedAt: string | null;
  product: Product | null;
  store: Store | null;
}

export const ISSUE_TYPE_ICONS: Record<DataQualityIssueType, string> = {
  missing_expiry: "CalendarX",
  stock_mismatch: "PackageX",
  stale_inventory: "Clock",
  no_sales_high_stock: "TrendingDown",
  inconsistent_batch: "AlertTriangle",
  low_confidence_recommendation: "Sparkles",
};

export const ISSUE_TYPE_TONE: Record<DataQualityIssueType, string> = {
  missing_expiry: "rose",
  stock_mismatch: "amber",
  stale_inventory: "sky",
  no_sales_high_stock: "indigo",
  inconsistent_batch: "orange",
  low_confidence_recommendation: "violet",
};

export const ISSUE_SUGGESTED_FIX: Record<DataQualityIssueType, string[]> = {
  missing_expiry: [
    "Mağaza menecerini bu məhsul üçün son istifadə tarixini daxil etməyə yönləndir.",
    "İlgili batch-ın supplier qəbz sənədini yoxla.",
    "Receipt log-larında batch_code üzərindən axtar.",
  ],
  stock_mismatch: [
    "Fiziki sayım tapşırığı yarat (stock_check).",
    "POS son 24 saatlıq tranzaksiyalarını yenidən sinxronlaşdır.",
    "Reserved_stock dəyərinin manual mənbəyini izah et.",
  ],
  stale_inventory: [
    "Inventory scanner inteqrasiyasını yenidən başlat.",
    "Mağaza-ID üzrə son sinxron tarixini yoxla.",
    "Manual sinxron tapşırığı tələb et.",
  ],
  no_sales_high_stock: [
    "Rəf yerləşdirməsini və ya etiket görünürlüyünü yoxla.",
    "Endirim və ya transfer ssenarisini müzakirə et.",
    "Kateqoriya menecerini xəbərdar et.",
  ],
  inconsistent_batch: [
    "Batch_code və expiry_date sahələrinin uyğunluğunu auditə göndər.",
    "Supplier ilə əlaqə saxla və yeni partiya sənədi tələb et.",
    "Sistem tərəfindən ən sonuncu sinxron loqunu yoxla.",
  ],
  low_confidence_recommendation: [
    "Risk göstəricilərinin əsas mənbəyini auditdən keçir.",
    "İlgili sales aggregate yenidən hesablat.",
    "AI-modelə əlavə kontekst (məs. promo aktivliyi) göndər.",
  ],
};

export const INTEGRATION_LABELS = ["POS", "ERP", "Supplier Portal", "Inventory Scanner"] as const;
export type IntegrationKey = (typeof INTEGRATION_LABELS)[number];

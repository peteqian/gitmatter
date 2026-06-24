import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Banknote,
  Calendar,
  DollarSign,
  Hash,
  List,
  Percent,
  Tag,
  ToggleLeft,
} from "lucide-react";

// Tabular column response formats. Free string on the wire (Column.format), but
// the editor offers this closed set.
export type ColumnFormat =
  | "text"
  | "bulleted_list"
  | "number"
  | "percentage"
  | "monetary_amount"
  | "currency"
  | "yes_no"
  | "date"
  | "tag";

type ColumnFormatInfo = {
  label: string;
  icon: LucideIcon;
};

const FORMAT_INFO: Record<ColumnFormat, ColumnFormatInfo> = {
  text: { label: "Free text", icon: AlignLeft },
  bulleted_list: { label: "Bulleted list", icon: List },
  number: { label: "Number", icon: Hash },
  percentage: { label: "Percentage", icon: Percent },
  monetary_amount: { label: "Money amount", icon: Banknote },
  currency: { label: "Currency", icon: DollarSign },
  yes_no: { label: "Yes / no", icon: ToggleLeft },
  date: { label: "Date", icon: Calendar },
  tag: { label: "Tags", icon: Tag },
};

export const FORMAT_OPTIONS = Object.entries(FORMAT_INFO).map(([value, info]) => ({
  value: value as ColumnFormat,
  ...info,
}));

export function formatLabel(format: string): string {
  return getFormatInfo(format).label;
}

export function formatIcon(format: string): LucideIcon {
  return getFormatInfo(format).icon;
}

function getFormatInfo(format: string): ColumnFormatInfo {
  if (isColumnFormat(format)) return FORMAT_INFO[format];
  return FORMAT_INFO.text;
}

function isColumnFormat(format: string): format is ColumnFormat {
  return format in FORMAT_INFO;
}

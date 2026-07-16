import { parseWidgetTaxMode, type WidgetTaxMode } from "@/lib/widget-legal-versions";

export type WidgetSellerDetails = {
  city: string;
  country: string;
  countryCode: string;
  email: string;
  name: string;
  postalCode: string;
  street: string;
  taxId: string;
  taxNumber: string;
  taxMode: WidgetTaxMode | null;
  tradingName: string;
  vatId: string;
};

export function getWidgetSellerDetails(): WidgetSellerDetails {
  return {
    city: read("LEGAL_SELLER_CITY", "München"),
    country: read("LEGAL_SELLER_COUNTRY", "Deutschland"),
    countryCode: read("LEGAL_SELLER_COUNTRY_CODE", "DE").toUpperCase(),
    email: read("LEGAL_SELLER_EMAIL", "ai-sports-prediction@outlook.com"),
    name: read("LEGAL_SELLER_NAME", "Jonas Schröder"),
    postalCode: read("LEGAL_SELLER_POSTAL_CODE", "81541"),
    street: read("LEGAL_SELLER_STREET", ""),
    taxId: read("LEGAL_SELLER_VAT_ID") || read("LEGAL_SELLER_TAX_NUMBER"),
    taxNumber: read("LEGAL_SELLER_TAX_NUMBER"),
    taxMode: parseWidgetTaxMode(process.env.WIDGET_TAX_MODE),
    tradingName: read("LEGAL_SELLER_TRADING_NAME", "AI Sports Prediction"),
    vatId: read("LEGAL_SELLER_VAT_ID")
  };
}

export function isWidgetDirectSalesLegallyConfigured(): boolean {
  const seller = getWidgetSellerDetails();
  return readBoolean(process.env.WIDGET_DIRECT_SALES_ENABLED)
    && Boolean(seller.name && seller.street && seller.postalCode && seller.city && seller.countryCode)
    && Boolean(seller.taxMode)
    && Boolean(seller.vatId)
    && (seller.taxMode !== "standard" || readBoolean(process.env.STRIPE_TAX_READY))
    && readBoolean(process.env.WIDGET_INVOICE_DELIVERY_READY);
}

function read(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function readBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

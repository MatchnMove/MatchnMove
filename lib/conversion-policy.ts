export const CONVERSION_NAMES = [
  "homepage_viewed",
  "quote_cta_clicked",
  "quote_form_started",
  "quote_step_completed",
  "quote_submission_failed",
  "quote_submitted",
  "cleaning_quote_submitted",
  "cleaning_option_selected",
  "calculator_used",
  "calculator_to_quote",
  "inventory_builder_started",
  "inventory_used_in_quote",
  "checklist_started",
  "checklist_revisited",
  "mover_profile_viewed",
  "partner_signup_started",
  "partner_registration_completed",
] as const;
export const CONVERSION_SOURCES = [
  "homepage",
  "homepage_hero",
  "quote_form",
  "calculator",
  "inventory",
  "checklist",
  "mover_profile",
  "mover",
  "cleaner",
  "navigation",
] as const;
const aliases: Record<string, string> = {
  quote_cta_click: "quote_cta_clicked",
  quote_start: "quote_form_started",
  quote_form_view: "quote_form_started",
  quote_route_complete: "quote_cta_clicked",
  quote_step_complete: "quote_step_completed",
  quote_submit_error: "quote_submission_failed",
  quote_submit_success: "quote_submitted",
  cleaning_quote_opt_in: "cleaning_option_selected",
  cleaning_option_selected: "cleaning_option_selected",
  cleaning_selected: "cleaning_option_selected",
};
export function safeConversionEvent(
  name: string,
  params: Record<string, unknown> = {},
) {
  const canonical = aliases[name] ?? name;
  if (!(CONVERSION_NAMES as readonly string[]).includes(canonical)) return null;
  const source =
    typeof params.source === "string" &&
    (CONVERSION_SOURCES as readonly string[]).includes(params.source)
      ? params.source
      : undefined;
  const candidate = params.step_number ?? params.step;
  const step =
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 1 &&
    candidate <= 3
      ? candidate
      : undefined;
  return { name: canonical, source, step };
}

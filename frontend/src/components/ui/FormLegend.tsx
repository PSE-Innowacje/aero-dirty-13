import { useTranslation } from "react-i18next";

export function FormLegend() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-muted-foreground mb-4">
      * — {t('common.requiredField')}
    </p>
  );
}

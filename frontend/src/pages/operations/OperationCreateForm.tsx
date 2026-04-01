/**
 * OperationCreateForm — the create-mode form for new flight operations.
 *
 * Renders order_number, short_description, activity_types checkboxes,
 * additional_info, contact_emails, proposed dates, submit/cancel buttons,
 * and the KML upload note.
 */
import { type FormEvent, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ── Constants ──────────────────────────────────────────────────────

const ACTIVITY_TYPE_OPTIONS = [
  { value: "oględziny wizualne", labelKey: "operations.activityTypeVisualInspection" },
  { value: "skan 3D", labelKey: "operations.activityType3dScan" },
  { value: "lokalizacja awarii", labelKey: "operations.activityTypeFaultLocation" },
  { value: "zdjęcia", labelKey: "operations.activityTypePhotos" },
  { value: "patrolowanie", labelKey: "operations.activityTypePatrolling" },
];

// ── Props ──────────────────────────────────────────────────────────

export interface OperationCreateFormProps {
  orderNumber: string;
  shortDescription: string;
  activityTypes: string[];
  additionalInfo: string;
  contactEmails: string;
  proposedDateEarliest: string;
  proposedDateLatest: string;
  onOrderNumberChange: (v: string) => void;
  onShortDescriptionChange: (v: string) => void;
  onActivityToggle: (value: string) => void;
  onAdditionalInfoChange: (v: string) => void;
  onContactEmailsChange: (v: string) => void;
  onProposedDateEarliestChange: (v: string) => void;
  onProposedDateLatestChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function OperationCreateForm({
  orderNumber,
  shortDescription,
  activityTypes,
  additionalInfo,
  contactEmails,
  proposedDateEarliest,
  proposedDateLatest,
  onOrderNumberChange,
  onShortDescriptionChange,
  onActivityToggle,
  onAdditionalInfoChange,
  onContactEmailsChange,
  onProposedDateEarliestChange,
  onProposedDateLatestChange,
  onSubmit,
  onCancel,
  isSaving,
}: OperationCreateFormProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-md bg-surface-container-low p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">{t('operations.orderNumber')} *</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => onOrderNumberChange(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">{t('operations.shortDescription')} *</Label>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => onShortDescriptionChange(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Activity types checkboxes */}
          <div className="space-y-2">
            <Label>{t('operations.activityTypesLabel')} *</Label>
            <div className="flex flex-wrap gap-3">
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={activityTypes.includes(opt.value)}
                    onChange={() => onActivityToggle(opt.value)}
                    className="rounded border-input"
                  />
                  {t(opt.labelKey)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">{t('operations.additionalInfo')}</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                onAdditionalInfoChange(e.target.value)
              }
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmails">
              {t('operations.contactEmails')}
            </Label>
            <Input
              id="contactEmails"
              value={contactEmails}
              onChange={(e) => onContactEmailsChange(e.target.value)}
              placeholder="jan@example.com, anna@example.com"
            />
          </div>

          {/* Proposed dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposedDateEarliest">
                {t('operations.proposedDateFrom')}
              </Label>
              <Input
                id="proposedDateEarliest"
                type="date"
                value={proposedDateEarliest}
                onChange={(e) => onProposedDateEarliestChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposedDateLatest">{t('operations.proposedDateTo')}</Label>
              <Input
                id="proposedDateLatest"
                type="date"
                value={proposedDateLatest}
                onChange={(e) => onProposedDateLatestChange(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-3">
            <p className="text-sm text-blue-400">
              {t('operations.kmlUploadAfterCreate')}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t('operations.saving')
                : t('operations.createOperation')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              {t('operations.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * OperationDetailView — detail-mode content for an existing operation.
 *
 * Renders form fields (some disabled based on role/status), KML upload,
 * map visualization, audit trail, comments section, linked orders,
 * and post-realization notes.
 */
import { type FormEvent, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { OperationMap } from "@/components/maps/OperationMap";
import { Upload } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────

const ACTIVITY_TYPE_OPTIONS = [
  { value: "oględziny wizualne", labelKey: "operations.activityTypeVisualInspection" },
  { value: "skan 3D", labelKey: "operations.activityType3dScan" },
  { value: "lokalizacja awarii", labelKey: "operations.activityTypeFaultLocation" },
  { value: "zdjęcia", labelKey: "operations.activityTypePhotos" },
  { value: "patrolowanie", labelKey: "operations.activityTypePatrolling" },
];

// ── Types ──────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_email: string;
}

interface CommentEntry {
  id: number;
  content: string;
  created_at: string;
  author_email: string;
  author_name: string;
}

interface LinkedOrder {
  id: number;
  status: number;
}

export interface OperationDetailData {
  id: number;
  order_number: string | null;
  short_description: string | null;
  route_coordinates: [number, number][] | null;
  route_km: number | null;
  proposed_date_earliest: string | null;
  proposed_date_latest: string | null;
  planned_date_earliest: string | null;
  planned_date_latest: string | null;
  activity_types: string[] | null;
  additional_info: string | null;
  status: number;
  contact_emails: string[] | null;
  post_realization_notes: string | null;
  created_at: string | null;
  created_by_email: string;
  audit_logs: AuditLogEntry[];
  comments: CommentEntry[];
  linked_orders?: LinkedOrder[];
}

// ── Props ──────────────────────────────────────────────────────────

export interface OperationDetailViewProps {
  operation: OperationDetailData;
  canEdit: boolean;
  isSupervisor: boolean;

  // Form field values
  orderNumber: string;
  shortDescription: string;
  activityTypes: string[];
  additionalInfo: string;
  contactEmails: string;
  proposedDateEarliest: string;
  proposedDateLatest: string;
  plannedDateEarliest: string;
  plannedDateLatest: string;
  postRealizationNotes: string;

  // Form field change handlers
  onOrderNumberChange: (v: string) => void;
  onShortDescriptionChange: (v: string) => void;
  onActivityToggle: (value: string) => void;
  onAdditionalInfoChange: (v: string) => void;
  onContactEmailsChange: (v: string) => void;
  onProposedDateEarliestChange: (v: string) => void;
  onProposedDateLatestChange: (v: string) => void;
  onPlannedDateEarliestChange: (v: string) => void;
  onPlannedDateLatestChange: (v: string) => void;
  onPostRealizationNotesChange: (v: string) => void;

  // Form submit
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;

  // KML upload
  kmlFile: File | null;
  onKmlFileChange: (f: File | null) => void;
  onKmlUpload: () => void;
  kmlUploading: boolean;
  kmlError: string | null;

  // Comments
  commentText: string;
  onCommentTextChange: (v: string) => void;
  onAddComment: () => void;
  commentPending: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function OperationDetailView({
  operation,
  canEdit,
  isSupervisor,
  orderNumber,
  shortDescription,
  activityTypes,
  additionalInfo,
  contactEmails,
  proposedDateEarliest,
  proposedDateLatest,
  plannedDateEarliest,
  plannedDateLatest,
  postRealizationNotes,
  onOrderNumberChange,
  onShortDescriptionChange,
  onActivityToggle,
  onAdditionalInfoChange,
  onContactEmailsChange,
  onProposedDateEarliestChange,
  onProposedDateLatestChange,
  onPlannedDateEarliestChange,
  onPlannedDateLatestChange,
  onPostRealizationNotesChange,
  onSubmit,
  onCancel,
  isSaving,
  kmlFile,
  onKmlFileChange,
  onKmlUpload,
  kmlUploading,
  kmlError,
  commentText,
  onCommentTextChange,
  onAddComment,
  commentPending,
}: OperationDetailViewProps) {
  const { t } = useTranslation();

  const proposedDateError = !!(proposedDateEarliest && proposedDateLatest && proposedDateLatest < proposedDateEarliest);
  const plannedDateError = !!(plannedDateEarliest && plannedDateLatest && plannedDateLatest < plannedDateEarliest);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form fields */}
        <div className="rounded-md bg-surface-container-low p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">{t('operations.orderNumber')} *</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => onOrderNumberChange(e.target.value)}
                maxLength={30}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">{t('operations.shortDescription')} *</Label>
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(e) => onShortDescriptionChange(e.target.value)}
                maxLength={100}
                disabled={!canEdit}
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
                      disabled={!canEdit}
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
                disabled={!canEdit}
              />
            </div>

            {/* Post-realization notes — editable by Supervisor only */}
            <div className="space-y-2">
              <Label htmlFor="postRealizationNotes">{t('operations.postRealizationNotes')}</Label>
              <Textarea
                id="postRealizationNotes"
                value={postRealizationNotes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  onPostRealizationNotesChange(e.target.value)
                }
                placeholder={t('operations.postRealizationNotesPlaceholder')}
                maxLength={1000}
                rows={3}
                disabled={!isSupervisor}
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
                disabled={!canEdit}
              />
            </div>

            {/* Proposed dates — editable by Planner and Supervisor */}
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
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedDateLatest">{t('operations.proposedDateTo')}</Label>
                <Input
                  id="proposedDateLatest"
                  type="date"
                  value={proposedDateLatest}
                  onChange={(e) => onProposedDateLatestChange(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {proposedDateError && (
              <p className="text-sm text-destructive-foreground">{t('operations.validationProposedDateOrder')}</p>
            )}

            {/* Planned dates — editable ONLY by Supervisor in detail mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedDateEarliest">
                  {t('operations.plannedDateFrom')}
                </Label>
                <Input
                  id="plannedDateEarliest"
                  type="date"
                  value={plannedDateEarliest}
                  onChange={(e) => onPlannedDateEarliestChange(e.target.value)}
                  disabled={!isSupervisor}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedDateLatest">{t('operations.plannedDateTo')}</Label>
                <Input
                  id="plannedDateLatest"
                  type="date"
                  value={plannedDateLatest}
                  onChange={(e) => onPlannedDateLatestChange(e.target.value)}
                  disabled={!isSupervisor}
                />
              </div>
            </div>

            {plannedDateError && (
              <p className="text-sm text-destructive-foreground">{t('operations.validationPlannedDateOrder')}</p>
            )}

            {canEdit && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSaving || proposedDateError || plannedDateError}>
                  {isSaving
                    ? t('operations.saving')
                    : t('operations.saveChanges')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  {t('operations.cancel')}
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Right: KML upload + Map */}
        <div className="space-y-6">
          {/* KML Upload */}
          {canEdit && (
            <div className="rounded-md bg-surface-container-low p-6">
              <h2 className="text-lg font-semibold mb-3">{t('operations.kmlFile')}</h2>
              {operation.route_km != null && (
                <p className="text-sm text-muted-foreground mb-3">
                  {t('operations.currentRouteText')} <strong>{operation.route_km} km</strong>
                </p>
              )}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".kml"
                  onChange={(e) =>
                    onKmlFileChange(e.target.files?.[0] ?? null)
                  }
                  className="flex-1"
                />
                <Button
                  onClick={onKmlUpload}
                  disabled={!kmlFile || kmlUploading}
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {kmlUploading ? t('operations.uploading') : t('operations.uploadKml')}
                </Button>
              </div>
              {kmlError && (
                <p className="text-xs text-destructive mt-2">{kmlError}</p>
              )}
            </div>
          )}

          {/* Map */}
          {operation.route_coordinates &&
            operation.route_coordinates.length > 0 && (
              <div className="rounded-md bg-surface-container-low p-6">
                <h2 className="text-lg font-semibold mb-3">
                  {t('operations.routeMap')}
                  {operation.route_km != null &&
                    ` (${operation.route_km} km)`}
                </h2>
                <OperationMap
                  coordinates={
                    operation.route_coordinates as [number, number][]
                  }
                />
              </div>
            )}
        </div>
      </div>

      {/* Audit Trail */}
      {operation.audit_logs.length > 0 && (
        <div className="mt-6 rounded-md bg-surface-container-low p-6">
          <h2 className="text-lg font-semibold mb-3">{t('operations.auditTrail')}</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operations.auditField')}</TableHead>
                  <TableHead>{t('operations.auditOldValue')}</TableHead>
                  <TableHead>{t('operations.auditNewValue')}</TableHead>
                  <TableHead>{t('operations.auditDate')}</TableHead>
                  <TableHead>{t('operations.auditPerson')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operation.audit_logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.field_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.old_value ?? "\u2014"}
                    </TableCell>
                    <TableCell>{log.new_value ?? "\u2014"}</TableCell>
                    <TableCell>
                      {new Date(log.changed_at).toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>{log.changed_by_email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mt-6 rounded-md bg-surface-container-low p-6">
        <h2 className="text-lg font-semibold mb-3">{t('operations.comments')}</h2>

        {operation.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            {t('operations.noComments')}
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {operation.comments.map((c) => (
              <div
                key={c.id}
                className="rounded-md border p-3 bg-muted/30"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{c.author_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("pl-PL")}
                  </p>
                </div>
                <p className="text-sm mt-1">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment form */}
        <div className="flex gap-3">
          <Textarea
            value={commentText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              onCommentTextChange(e.target.value)
            }
            placeholder={t('operations.addCommentPlaceholder')}
            maxLength={500}
            rows={2}
            className="flex-1"
          />
          <Button
            onClick={onAddComment}
            disabled={!commentText.trim() || commentPending}
            className="self-end"
          >
            {commentPending ? t('operations.adding') : t('operations.addComment')}
          </Button>
        </div>
      </div>

      {/* Linked orders */}
      <div className="mt-6 rounded-md bg-surface-container-low p-6">
        <h2 className="text-lg font-semibold mb-3">{t('operations.linkedOrders')}</h2>
        {operation.linked_orders && operation.linked_orders.length > 0 ? (
          <ul className="space-y-1">
            {operation.linked_orders.map((lo) => (
              <li key={lo.id} className="text-sm">
                #{lo.id}{" "}
                <Badge variant="outline" className="ml-1 text-xs">
                  {t(`orders.status${lo.status}`, { defaultValue: `Status ${lo.status}` })}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('operations.noLinkedOrders')}
          </p>
        )}
      </div>
    </>
  );
}

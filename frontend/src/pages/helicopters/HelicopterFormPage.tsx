/**
 * HelicopterFormPage — Create / edit helicopter with all PRD 6.1 fields.
 * Conditional: when status='aktywny', inspection_date is shown and required.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { HELICOPTER_STATUSES, HELICOPTER_STATUS_DISPLAY_KEY } from "@/lib/constants";

interface Helicopter {
  id: number;
  registration_number: string;
  helicopter_type: string;
  description: string | null;
  max_crew: number;
  max_payload_weight: number;
  status: string;
  inspection_date: string | null;
  range_km: number;
}

export function HelicopterFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [helicopterType, setHelicopterType] = useState("");
  const [description, setDescription] = useState("");
  const [maxCrew, setMaxCrew] = useState("1");
  const [maxPayloadWeight, setMaxPayloadWeight] = useState("1");
  const [status, setStatus] = useState<string>(HELICOPTER_STATUSES[0]!);
  const [inspectionDate, setInspectionDate] = useState("");
  const [rangeKm, setRangeKm] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: existing, isLoading: loadingExisting } = useQuery<Helicopter>({
    queryKey: ["helicopters", id],
    queryFn: () => apiFetch<Helicopter>(`/helicopters/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setRegistrationNumber(existing.registration_number);
      setHelicopterType(existing.helicopter_type);
      setDescription(existing.description ?? "");
      setMaxCrew(String(existing.max_crew));
      setMaxPayloadWeight(String(existing.max_payload_weight));
      setStatus(existing.status);
      setInspectionDate(existing.inspection_date ?? "");
      setRangeKm(String(existing.range_km));
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        registration_number: registrationNumber,
        helicopter_type: helicopterType,
        description: description || null,
        max_crew: Number(maxCrew),
        max_payload_weight: Number(maxPayloadWeight),
        status,
        inspection_date: status === "aktywny" ? inspectionDate || null : null,
        range_km: Number(rangeKm),
      };

      if (isEdit) {
        return apiFetch<Helicopter>(`/helicopters/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<Helicopter>("/helicopters", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helicopters"] });
      navigate("/helicopters");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        try {
          const detail = JSON.parse(err.detail);
          if (Array.isArray(detail)) {
            const errors: Record<string, string> = {};
            for (const item of detail) {
              const field = item.loc?.[item.loc.length - 1] ?? "unknown";
              errors[field] = item.msg ?? t('common.invalidValue');
            }
            setFieldErrors(errors);
            setError(null);
            return;
          }
        } catch {
          // Not JSON array
        }
        setError(err.detail);
      } else {
        setError(err.message);
      }
      setFieldErrors({});
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!registrationNumber.trim()) errors.registration_number = t('helicopters.validationRegistrationRequired');
    if (!helicopterType.trim()) errors.helicopter_type = t('helicopters.validationTypeRequired');
    const crew = Number(maxCrew);
    if (isNaN(crew) || crew < 1 || crew > 10) errors.max_crew = t('helicopters.validationMaxCrewRange');
    const payload = Number(maxPayloadWeight);
    if (isNaN(payload) || payload < 1 || payload > 1000) errors.max_payload_weight = t('helicopters.validationMaxPayloadRange');
    const range = Number(rangeKm);
    if (isNaN(range) || range < 1 || range > 1000) errors.range_km = t('helicopters.validationRangeKmRange');
    if (status === "aktywny" && !inspectionDate) errors.inspection_date = t('helicopters.validationInspectionRequired');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    saveMutation.mutate();
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/helicopters")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.backToList')}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? t('helicopters.editTitle') : t('helicopters.newTitle')}
        </h1>
      </div>

      <div className="max-w-lg rounded-md bg-surface-container-low p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">{t('helicopters.registrationNumber')} *</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              maxLength={30}
              required
            />
            {fieldErrors.registration_number && (
              <p className="text-xs text-destructive">{fieldErrors.registration_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="helicopterType">{t('helicopters.type')} *</Label>
            <Input
              id="helicopterType"
              value={helicopterType}
              onChange={(e) => setHelicopterType(e.target.value)}
              maxLength={100}
              required
            />
            {fieldErrors.helicopter_type && (
              <p className="text-xs text-destructive">{fieldErrors.helicopter_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('helicopters.description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
            {fieldErrors.description && (
              <p className="text-xs text-destructive">{fieldErrors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxCrew">{t('helicopters.maxCrew')} *</Label>
            <Input
              id="maxCrew"
              type="number"
              min={1}
              max={10}
              value={maxCrew}
              onChange={(e) => setMaxCrew(e.target.value)}
              required
            />
            {fieldErrors.max_crew && (
              <p className="text-xs text-destructive">{fieldErrors.max_crew}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPayloadWeight">{t('helicopters.maxPayload')} *</Label>
            <Input
              id="maxPayloadWeight"
              type="number"
              min={1}
              max={1000}
              value={maxPayloadWeight}
              onChange={(e) => setMaxPayloadWeight(e.target.value)}
              required
            />
            {fieldErrors.max_payload_weight && (
              <p className="text-xs text-destructive">{fieldErrors.max_payload_weight}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('helicopters.statusLabel')} *</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {HELICOPTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(HELICOPTER_STATUS_DISPLAY_KEY[s] ?? s)}
                </option>
              ))}
            </Select>
          </div>

          {status === "aktywny" && (
            <div className="space-y-2">
              <Label htmlFor="inspectionDate">{t('helicopters.inspectionDate')} *</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                required
              />
              {fieldErrors.inspection_date && (
                <p className="text-xs text-destructive">{fieldErrors.inspection_date}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rangeKm">{t('helicopters.rangeKm')} *</Label>
            <Input
              id="rangeKm"
              type="number"
              min={1}
              max={1000}
              value={rangeKm}
              onChange={(e) => setRangeKm(e.target.value)}
              required
            />
            {fieldErrors.range_km && (
              <p className="text-xs text-destructive">{fieldErrors.range_km}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? t('common.saving')
                : isEdit
                  ? t('common.saveChanges')
                  : t('helicopters.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/helicopters")}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

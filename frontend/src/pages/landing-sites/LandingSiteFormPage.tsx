/**
 * LandingSiteFormPage — Create / edit landing site with PRD 6.3 fields.
 * Fields: name, latitude, longitude.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { parseApiFieldErrors } from "@/lib/form-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

interface LandingSite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export function LandingSiteFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: existing, isLoading: loadingExisting } = useQuery<LandingSite>({
    queryKey: ["landing-sites", id],
    queryFn: () => apiFetch<LandingSite>(`/landing-sites/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setLatitude(String(existing.latitude));
      setLongitude(String(existing.longitude));
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      if (isEdit) {
        return apiFetch<LandingSite>(`/landing-sites/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<LandingSite>("/landing-sites", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-sites"] });
      navigate("/landing-sites");
    },
    onError: (err: Error) => {
      const result = parseApiFieldErrors(err, t('common.invalidValue'));
      setError(result.error);
      setFieldErrors(result.fieldErrors);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t('landingSites.validationNameRequired');
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = t('landingSites.validationLatitudeRange');
    const lng = Number(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) errors.longitude = t('landingSites.validationLongitudeRange');

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/landing-sites")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.backToList')}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? t('landingSites.editTitle') : t('landingSites.newTitle')}
        </h1>
      </div>

      <div className="max-w-lg rounded-md bg-surface-container-low p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('landingSites.name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              required
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="latitude">{t('landingSites.latitudeLabel')} *</Label>
            <Input
              id="latitude"
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
            {fieldErrors.latitude && (
              <p className="text-xs text-destructive">{fieldErrors.latitude}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">{t('landingSites.longitudeLabel')} *</Label>
            <Input
              id="longitude"
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
            {fieldErrors.longitude && (
              <p className="text-xs text-destructive">{fieldErrors.longitude}</p>
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
                  : t('landingSites.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/landing-sites")}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

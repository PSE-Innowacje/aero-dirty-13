/**
 * LandingSiteFormPage — Create / edit landing site with PRD 6.3 fields.
 * Fields: name, latitude, longitude.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
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
      if (err instanceof ApiError) {
        try {
          const detail = JSON.parse(err.detail);
          if (Array.isArray(detail)) {
            const errors: Record<string, string> = {};
            for (const item of detail) {
              const field = item.loc?.[item.loc.length - 1] ?? "unknown";
              errors[field] = item.msg ?? "Nieprawidłowa wartość";
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
    if (!name.trim()) errors.name = "Nazwa jest wymagana";
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = "Musi być między -90 a 90";
    const lng = Number(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) errors.longitude = "Musi być między -180 a 180";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    saveMutation.mutate();
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ładowanie…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/landing-sites")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Edytuj lądowisko" : "Nowe lądowisko"}
        </h1>
      </div>

      <div className="max-w-lg rounded-md border bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa *</Label>
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
            <Label htmlFor="latitude">Szerokość geograficzna *</Label>
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
            <Label htmlFor="longitude">Długość geograficzna *</Label>
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
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? "Zapisywanie…"
                : isEdit
                  ? "Zapisz zmiany"
                  : "Utwórz lądowisko"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/landing-sites")}>
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

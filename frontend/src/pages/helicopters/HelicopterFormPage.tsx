/**
 * HelicopterFormPage — Create / edit helicopter with all PRD 6.1 fields.
 * Conditional: when status='aktywny', inspection_date is shown and required.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

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

const STATUSES = ["aktywny", "nieaktywny"];

export function HelicopterFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [helicopterType, setHelicopterType] = useState("");
  const [description, setDescription] = useState("");
  const [maxCrew, setMaxCrew] = useState("1");
  const [maxPayloadWeight, setMaxPayloadWeight] = useState("1");
  const [status, setStatus] = useState(STATUSES[0]!);
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
    if (!registrationNumber.trim()) errors.registration_number = "Numer rejestracyjny jest wymagany";
    if (!helicopterType.trim()) errors.helicopter_type = "Typ jest wymagany";
    const crew = Number(maxCrew);
    if (isNaN(crew) || crew < 1 || crew > 10) errors.max_crew = "Musi być między 1 a 10";
    const payload = Number(maxPayloadWeight);
    if (isNaN(payload) || payload < 1 || payload > 1000) errors.max_payload_weight = "Musi być między 1 a 1000";
    const range = Number(rangeKm);
    if (isNaN(range) || range < 1 || range > 1000) errors.range_km = "Musi być między 1 a 1000";
    if (status === "aktywny" && !inspectionDate) errors.inspection_date = "Data przeglądu jest wymagana dla aktywnych";

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/helicopters")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Edytuj helikopter" : "Nowy helikopter"}
        </h1>
      </div>

      <div className="max-w-lg rounded-md border bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Numer rejestracyjny *</Label>
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
            <Label htmlFor="helicopterType">Typ *</Label>
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
            <Label htmlFor="description">Opis</Label>
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
            <Label htmlFor="maxCrew">Maks. załoga *</Label>
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
            <Label htmlFor="maxPayloadWeight">Maks. ładowność (kg) *</Label>
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
            <Label htmlFor="status">Status *</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {status === "aktywny" && (
            <div className="space-y-2">
              <Label htmlFor="inspectionDate">Data przeglądu *</Label>
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
            <Label htmlFor="rangeKm">Zasięg (km) *</Label>
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
                  : "Utwórz helikopter"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/helicopters")}>
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * CrewFormPage — Create / edit crew member with all PRD 6.2 fields.
 * Conditional: when role='Pilot', show pilot_license_number and pilot_license_expiry (required).
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

interface CrewMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  weight: number;
  role: string;
  pilot_license_number: string | null;
  pilot_license_expiry: string | null;
  training_expiry: string;
}

const ROLES = ["Pilot", "Obserwator"];

export function CrewFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [weight, setWeight] = useState("70");
  const [role, setRole] = useState(ROLES[0]!);
  const [pilotLicenseNumber, setPilotLicenseNumber] = useState("");
  const [pilotLicenseExpiry, setPilotLicenseExpiry] = useState("");
  const [trainingExpiry, setTrainingExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: existing, isLoading: loadingExisting } = useQuery<CrewMember>({
    queryKey: ["crew", id],
    queryFn: () => apiFetch<CrewMember>(`/crew/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setFirstName(existing.first_name);
      setLastName(existing.last_name);
      setEmail(existing.email);
      setWeight(String(existing.weight));
      setRole(existing.role);
      setPilotLicenseNumber(existing.pilot_license_number ?? "");
      setPilotLicenseExpiry(existing.pilot_license_expiry ?? "");
      setTrainingExpiry(existing.training_expiry);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        email,
        weight: Number(weight),
        role,
        training_expiry: trainingExpiry,
      };

      if (role === "Pilot") {
        body.pilot_license_number = pilotLicenseNumber || null;
        body.pilot_license_expiry = pilotLicenseExpiry || null;
      } else {
        body.pilot_license_number = null;
        body.pilot_license_expiry = null;
      }

      if (isEdit) {
        return apiFetch<CrewMember>(`/crew-members/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<CrewMember>("/crew-members", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew"] });
      navigate("/crew");
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
    if (!firstName.trim()) errors.first_name = "Imię jest wymagane";
    if (!lastName.trim()) errors.last_name = "Nazwisko jest wymagane";
    if (!email.trim()) errors.email = "Email jest wymagany";
    const w = Number(weight);
    if (isNaN(w) || w < 30 || w > 200) errors.weight = "Musi być między 30 a 200";
    if (!trainingExpiry) errors.training_expiry = "Data szkolenia jest wymagana";
    if (role === "Pilot") {
      if (!pilotLicenseNumber.trim()) errors.pilot_license_number = "Nr licencji jest wymagany dla pilota";
      if (!pilotLicenseExpiry) errors.pilot_license_expiry = "Data ważności licencji jest wymagana dla pilota";
    }

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/crew")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Edytuj członka załogi" : "Nowy członek załogi"}
        </h1>
      </div>

      <div className="max-w-lg rounded-md border bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Imię *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              required
            />
            {fieldErrors.first_name && (
              <p className="text-xs text-destructive">{fieldErrors.first_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Nazwisko *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              required
            />
            {fieldErrors.last_name && (
              <p className="text-xs text-destructive">{fieldErrors.last_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={100}
              required
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Waga (kg) *</Label>
            <Input
              id="weight"
              type="number"
              min={30}
              max={200}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            {fieldErrors.weight && (
              <p className="text-xs text-destructive">{fieldErrors.weight}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola *</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>

          {role === "Pilot" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pilotLicenseNumber">Nr licencji pilota *</Label>
                <Input
                  id="pilotLicenseNumber"
                  value={pilotLicenseNumber}
                  onChange={(e) => setPilotLicenseNumber(e.target.value)}
                  maxLength={30}
                  required
                />
                {fieldErrors.pilot_license_number && (
                  <p className="text-xs text-destructive">{fieldErrors.pilot_license_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pilotLicenseExpiry">Data ważności licencji *</Label>
                <Input
                  id="pilotLicenseExpiry"
                  type="date"
                  value={pilotLicenseExpiry}
                  onChange={(e) => setPilotLicenseExpiry(e.target.value)}
                  required
                />
                {fieldErrors.pilot_license_expiry && (
                  <p className="text-xs text-destructive">{fieldErrors.pilot_license_expiry}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="trainingExpiry">Data szkolenia *</Label>
            <Input
              id="trainingExpiry"
              type="date"
              value={trainingExpiry}
              onChange={(e) => setTrainingExpiry(e.target.value)}
              required
            />
            {fieldErrors.training_expiry && (
              <p className="text-xs text-destructive">{fieldErrors.training_expiry}</p>
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
                  : "Utwórz członka załogi"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/crew")}>
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * CrewFormPage — Create / edit crew member with all PRD 6.2 fields.
 * Conditional: when role='Pilot', show pilot_license_number and pilot_license_expiry (required).
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

const ROLES = ["Pilot", "Obserwator", "Mechanik", "Operator"];

const roleDisplayKey: Record<string, string> = {
  Pilot: "crew.rolePilot",
  Obserwator: "crew.roleObserver",
  Mechanik: "crew.roleMechanic",
  Operator: "crew.roleOperator",
};

export function CrewFormPage() {
  const { t } = useTranslation();
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
    queryFn: () => apiFetch<CrewMember>(`/crew-members/${id}`),
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
    if (!firstName.trim()) errors.first_name = t('crew.validationFirstNameRequired');
    if (!lastName.trim()) errors.last_name = t('crew.validationLastNameRequired');
    if (!email.trim()) errors.email = t('crew.validationEmailRequired');
    else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) errors.email = t('crew.validationEmailInvalid');
    const w = Number(weight);
    if (isNaN(w) || w < 30 || w > 200) errors.weight = t('crew.validationWeightRange');
    if (!trainingExpiry) errors.training_expiry = t('crew.validationTrainingRequired');
    if (role === "Pilot") {
      if (!pilotLicenseNumber.trim()) errors.pilot_license_number = t('crew.validationLicenseRequired');
      if (!pilotLicenseExpiry) errors.pilot_license_expiry = t('crew.validationLicenseExpiryRequired');
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
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/crew")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.backToList')}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? t('crew.editTitle') : t('crew.newTitle')}
        </h1>
      </div>

      <div className="max-w-lg rounded-md bg-surface-container-low p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('crew.firstName')} *</Label>
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
            <Label htmlFor="lastName">{t('crew.lastName')} *</Label>
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
            <Label htmlFor="email">{t('crew.email')} *</Label>
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
            <Label htmlFor="weight">{t('crew.weight')} *</Label>
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
            <Label htmlFor="role">{t('crew.role')} *</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(roleDisplayKey[r] ?? r)}
                </option>
              ))}
            </Select>
          </div>

          {role === "Pilot" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pilotLicenseNumber">{t('crew.pilotLicenseNumber')} *</Label>
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
                <Label htmlFor="pilotLicenseExpiry">{t('crew.pilotLicenseExpiry')} *</Label>
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
            <Label htmlFor="trainingExpiry">{t('crew.trainingExpiry')} *</Label>
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
                  : t('crew.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/crew")}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

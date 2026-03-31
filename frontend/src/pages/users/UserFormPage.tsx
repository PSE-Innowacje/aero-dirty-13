/**
 * UserFormPage — Create / edit user form with all PRD 6.4 fields.
 * Detects mode by URL: /users/new → create, /users/:id/edit → edit.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const ROLES = [
  "Administrator",
  "Osoba planująca",
  "Osoba nadzorująca",
  "Pilot",
];

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState(ROLES[0]!);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch user for edit mode
  const { data: existingUser, isLoading: loadingUser } = useQuery<User>({
    queryKey: ["users", id],
    queryFn: () => apiFetch<User>(`/users/${id}`),
    enabled: isEdit,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingUser) {
      setFirstName(existingUser.first_name);
      setLastName(existingUser.last_name);
      setEmail(existingUser.email);
      setSystemRole(existingUser.system_role);
    }
  }, [existingUser]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        email,
        system_role: systemRole,
      };
      // Password: required for create, optional for edit
      if (!isEdit || password) {
        body.password = password;
      }

      if (isEdit) {
        return apiFetch<User>(`/users/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        return apiFetch<User>("/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        // Try to parse validation errors from 422 response
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
          // Not JSON array — use raw detail
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

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.first_name = "Imię jest wymagane";
    if (!lastName.trim()) errors.last_name = "Nazwisko jest wymagane";
    if (!email.trim()) errors.email = "Email jest wymagany";
    if (!isEdit && !password) errors.password = "Hasło jest wymagane";
    if (password && password.length < 6) errors.password = "Minimum 6 znaków";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    saveMutation.mutate();
  }

  if (isEdit && loadingUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ładowanie…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/users")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Edytuj użytkownika" : "Nowy użytkownik"}
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
            <Label htmlFor="password">
              Hasło {isEdit ? "(pozostaw puste aby nie zmieniać)" : "*"}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required={!isEdit}
            />
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola *</Label>
            <Select
              id="role"
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
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
                  : "Utwórz użytkownika"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/users")}>
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

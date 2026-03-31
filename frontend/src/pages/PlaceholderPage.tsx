/**
 * PlaceholderPage — Shown for modules coming in future slices (S02-S04).
 */
import { useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  "/helicopters": "Helikoptery",
  "/crew": "Członkowie załogi",
  "/landing-sites": "Lądowiska planowe",
  "/operations": "Lista operacji",
  "/orders": "Lista zleceń",
};

export function PlaceholderPage() {
  const location = useLocation();
  const label = LABELS[location.pathname] ?? "Strona";

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">{label}</h1>
      <p className="mt-2 text-muted-foreground">
        Moduł w przygotowaniu — dostępny w kolejnych etapach.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { WEEKDAY_LABELS, formatMinutes } from "@/lib/matching/availability";

interface AvailabilityRow {
  id: string;
  weekday: number;
  startMin: number;
  endMin: number;
}

function timeToMin(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  return formatMinutes(min);
}

const PRESETS: Record<string, number[]> = {
  all: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [6, 0],
};

const DAY_OPTIONS = [
  { value: "all", label: "Todos os dias" },
  { value: "weekdays", label: "Dias úteis (seg–sex)" },
  { value: "weekend", label: "Fim de semana (sáb–dom)" },
  ...WEEKDAY_LABELS.map((label, idx) => ({ value: String(idx), label })),
];

function resolveWeekdays(selection: string): number[] {
  if (selection in PRESETS) return PRESETS[selection];
  return [Number(selection)];
}

interface SlotInput {
  weekday: number;
  startMin: number;
  endMin: number;
}

// Quando o horário final é menor ou igual ao inicial, o intervalo cruza a
// meia-noite: divide em um pedaço até 24:00 no dia selecionado e outro a
// partir de 00:00 no dia seguinte.
function splitOvernight(weekday: number, startMin: number, endMin: number): SlotInput[] {
  if (endMin > startMin) return [{ weekday, startMin, endMin }];

  const nextWeekday = (weekday + 1) % 7;
  const slots: SlotInput[] = [{ weekday, startMin, endMin: 24 * 60 }];
  if (endMin > 0) slots.push({ weekday: nextWeekday, startMin: 0, endMin });
  return slots;
}

export default function AvailabilityManager() {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [daySelection, setDaySelection] = useState("2");
  const [start, setStart] = useState("20:00");
  const [end, setEnd] = useState("23:00");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/availability");
    const data = await res.json();
    setRows(data.availability ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weekdays = resolveWeekdays(daySelection);
    const startMin = timeToMin(start);
    const endMin = timeToMin(end);

    if (startMin === endMin) {
      setError("Horário final precisa ser depois do inicial");
      return;
    }

    const slots = weekdays.flatMap((weekday) => splitOvernight(weekday, startMin, endMin));

    const results = await Promise.all(
      slots.map((slot) =>
        fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slot),
        }),
      ),
    );

    const failed = results.find((res) => !res.ok);
    if (failed) {
      const data = await failed.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar");
    }
    await load();
  }

  async function removeSlot(id: string) {
    await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <form onSubmit={addSlot} style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
        <div className="form-field">
          <label htmlFor="weekday">Dia</label>
          <select id="weekday" value={daySelection} onChange={(e) => setDaySelection(e.target.value)}>
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="start">Início</label>
          <input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="end">Fim</label>
          <input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <button type="submit">Adicionar</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <p className="muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="muted">Nenhum horário cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                <th>Horário</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{WEEKDAY_LABELS[row.weekday]}</td>
                  <td>
                    {minToTime(row.startMin)}–{minToTime(row.endMin)}
                  </td>
                  <td>
                    <button className="secondary" onClick={() => removeSlot(row.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

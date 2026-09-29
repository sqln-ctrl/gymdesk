"use client";

import { ChangeEvent, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { initialMemberFormState } from "@/lib/members/form-state";
import { importMembersAction } from "@/server/actions/members";

type BranchOption = { id: string; label: string };
type ImportRow = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
};

const fields = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "dateOfBirth",
  "emergencyContactName",
  "emergencyContactPhone",
  "address",
  "notes",
] as const;

const csvTemplate = `${fields.join(",")}\nAmina,Khan,+923001234567,amina@example.com,1995-02-14,,,,,`;

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function readRows(text: string): { rows: ImportRow[]; errors: string[] } {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return { rows: [], errors: ["The CSV needs a header row and at least one member row."] };

  const headers = parsed[0].map(normalizeHeader);
  const indexes = new Map(headers.map((header, index) => [header, index]));
  if (!indexes.has("firstname") || !indexes.has("lastname")) {
    return { rows: [], errors: ["The CSV must include firstName and lastName columns."] };
  }

  const rows = parsed.slice(1).map((cells) => {
    const row: Partial<ImportRow> = {};
    for (const field of fields) {
      const index = indexes.get(normalizeHeader(field));
      const value = index === undefined ? "" : (cells[index] ?? "").trim();
      row[field] = value;
    }
    return row as ImportRow;
  });
  const errors: string[] = [];
  if (rows.length > 200) errors.push("Import no more than 200 member rows at a time.");
  rows.forEach((row, index) => {
    if (!row.firstName || !row.lastName) errors.push(`Row ${index + 2} needs both a first and last name.`);
  });

  return { rows, errors };
}

function ImportSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50" disabled={disabled || pending} type="submit">
      {pending ? "Importing…" : "Import members"}
    </button>
  );
}

export function MemberImportForm({ branches }: { branches: BranchOption[] }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>();
  const [state, formAction] = useActionState(importMembersAction, initialMemberFormState);
  const serialisedRows = useMemo(() => JSON.stringify(rows), [rows]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 80 * 1024) {
      setRows([]);
      setErrors(["Use a CSV smaller than 80 KB (up to 200 rows)."]);
      return;
    }

    const imported = readRows(await file.text());
    setRows(imported.rows);
    setErrors(imported.errors);
    setFileName(file.name);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{state.message}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="primaryBranchId">Import into branch</label>
          <select className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm" defaultValue={branches.length === 1 ? branches[0].id : ""} id="primaryBranchId" name="primaryBranchId" required>
            <option disabled value="">Choose a branch</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="member-csv">CSV file</label>
          <input accept=".csv,text/csv" className="mt-2 block h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm" id="member-csv" name="csv" onChange={handleFileChange} required type="file" />
        </div>
      </div>

      <input name="rowsJson" type="hidden" value={serialisedRows} />

      <div className="rounded-lg bg-[var(--surface-muted)] p-4 text-sm">
        <p className="font-medium">Expected columns</p>
        <p className="mt-1 leading-6 text-[var(--muted-foreground)]">firstName and lastName are required. Other supported columns are phone, email, dateOfBirth (YYYY-MM-DD), emergencyContactName, emergencyContactPhone, address, and notes.</p>
        <a className="mt-3 inline-block font-semibold text-[var(--brand)] hover:underline" download="gymflow-member-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}>Download CSV template</a>
      </div>

      {fileName ? <p className="text-sm text-[var(--muted-foreground)]">{fileName}: {rows.length} row{rows.length === 1 ? "" : "s"} ready for preview.</p> : null}
      {errors.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
          {errors.length > 5 ? <li>…and {errors.length - 5} more row issues.</li> : null}
        </ul>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border">
          <div className="border-b bg-[var(--surface-muted)] px-4 py-3"><h2 className="font-semibold">Preview</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Date of birth</th></tr></thead>
              <tbody className="divide-y">{rows.slice(0, 8).map((row, index) => <tr key={`${row.firstName}-${row.lastName}-${index}`}><td className="px-4 py-3 font-medium">{row.firstName} {row.lastName}</td><td className="px-4 py-3">{row.phone || "—"}</td><td className="px-4 py-3">{row.email || "—"}</td><td className="px-4 py-3">{row.dateOfBirth || "—"}</td></tr>)}</tbody>
            </table>
          </div>
          {rows.length > 8 ? <p className="border-t px-4 py-3 text-sm text-[var(--muted-foreground)]">Showing 8 of {rows.length} rows.</p> : null}
        </div>
      ) : null}

      <div className="flex justify-end border-t pt-6"><ImportSubmitButton disabled={rows.length === 0 || errors.length > 0} /></div>
    </form>
  );
}

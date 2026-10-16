import { z } from "zod";

import type { DashboardDataset } from "@/types/dashboard";

const skemaIdOpsional = z.string().min(1).nullable();
const skemaAngka = z.number().finite();

const skemaKonteksDashboard = z.object({
  siklusId: z.string().min(1),
  areaId: z.string().min(1),
  areaName: z.string(),
  namaSiklus: z.string(),
  statusSiklus: z.enum(["Aktif", "Selesai", "Ditutup"]),
  tanggalPindahTanam: z.string().min(1),
  modalAwal: skemaAngka,
  label: z.string(),
});

const skemaFaktaHarian = z.object({
  date: z.string().min(1),
  siklusId: skemaIdOpsional,
  areaId: skemaIdOpsional,
  pendapatan: skemaAngka,
  pengeluaran: skemaAngka,
  harvestWeight: skemaAngka,
  harvestCount: skemaAngka,
});

const skemaFaktaBiaya = z.object({
  date: z.string().min(1),
  siklusId: skemaIdOpsional,
  areaId: skemaIdOpsional,
  kategoriId: skemaIdOpsional,
  kategoriName: z.string(),
  totalBiaya: skemaAngka,
});

const skemaAktivitasOperasional = z.object({
  id: z.string().min(1),
  module: z.enum(["perawatan", "inspeksi", "operasional"]),
  siklusId: skemaIdOpsional,
  areaId: skemaIdOpsional,
  occurredAt: z.string().min(1),
  finishedAt: z.string().min(1).nullable(),
  title: z.string(),
  originalStatus: z.string(),
  normalizedStatus: z.enum(["pending", "in_progress", "completed"]),
  durationHours: skemaAngka,
  priority: z.string().nullable(),
  phTanah: skemaAngka.nullable(),
  tingkatSerangan: skemaAngka.nullable(),
  radius: skemaAngka.nullable(),
});

const skemaTemuanInspeksi = z.object({
  id: z.string().min(1),
  inspeksiId: z.string().min(1),
  kendalaId: z.string().min(1),
  siklusId: skemaIdOpsional,
  areaId: skemaIdOpsional,
  occurredAt: z.string().min(1),
  name: z.string(),
  kind: z.string(),
  note: z.string().nullable(),
});

const skemaAktivitasDashboard = z.object({
  id: z.string().min(1),
  type: z.enum(["perawatan", "inspeksi", "operasional", "harvest", "expense"]),
  siklusId: skemaIdOpsional,
  areaId: skemaIdOpsional,
  occurredAt: z.string().min(1),
  title: z.string(),
  description: z.string(),
  status: z.string().nullable(),
});

export const skemaDatasetDashboard = z.object({
  cycleStatus: z.enum(["aktif", "selesai"]),
  contexts: z.array(skemaKonteksDashboard),
  facts: z.array(skemaFaktaHarian),
  costFacts: z.array(skemaFaktaBiaya),
  operationalEvents: z.array(skemaAktivitasOperasional),
  inspectionFindings: z.array(skemaTemuanInspeksi),
  activities: z.array(skemaAktivitasDashboard),
  meta: z.object({
    generatedAt: z.string().min(1),
    timezone: z.literal("Asia/Jakarta"),
  }),
}) satisfies z.ZodType<DashboardDataset>;

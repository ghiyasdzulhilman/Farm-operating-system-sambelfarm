export const OPERASIONAL_SCHEMA = {
  id: "operasional",
  label: "Operasional Kebun",
  hint: "Aktivitas & tugas operasional harian",

  fields: [
    {
      key: "namaPekerjaan",
      label: "Nama pekerjaan",
      expectedType: "title",
      aliases: ["task", "pekerjaan", "nama pekerjaan", "operasional"],
    },

    {
      key: "kategori",
      label: "Kategori",
      expectedType: "select",
      aliases: ["kategori", "activity", "jenis kegiatan", "aktivitas"],
    },

    {
      key: "status",
      label: "Status",
      expectedType: "status",
      aliases: ["status", "progress", "state"],
    },

    {
      key: "ditugaskanKe",
      label: "Ditugaskan ke",
      expectedType: "relation",
      aliases: ["ditugaskan ke", "petugas", "pekerja", "worker", "team"],
    },

    {
      key: "jenisTenagaKerja",
      label: "Jenis tenaga kerja",
      expectedType: "rollup|select|text",
      aliases: ["jenis tenaga kerja", "tipe pekerja", "employment type"],
    },

    {
      key: "area",
      label: "Area",
      expectedType: "relation",
      aliases: ["area", "blok", "lahan", "blok area"],
    },

    {
      key: "prioritas",
      label: "Prioritas",
      expectedType: "select",
      aliases: ["prioritas", "priority"],
    },

    {
      key: "waktuPengerjaan",
      label: "Waktu pengerjaan",
      expectedType: "date",
      aliases: ["waktu pengerjaan", "jam kerja", "start end", "tanggal waktu"],
    },

    {
      key: "durasiKerja",
      label: "Durasi kerja",
      expectedType: "number",
      aliases: ["durasi", "lama kerja", "jam"],
    },

  ],
} as const;
export const OPERASIONAL_SCHEMA = {
  key: "operasional",

  label: "Operasional Kebun",

  notion: {
    databaseType: "operasional",
  },

  fields: [
    {
      key: "namaPekerjaan",
      label: "Nama pekerjaan",
      expectedType:: "title",
      required: true,
    },

    {
      key: "kategori",
      label: "Kategori",
      expectedType:: "select",
      required: true,

      options: [
        "Penyemprotan",
        "Panen",
        "Sanitasi",
        "Maintenance",
        "Pengairan",
        "Pengangkutan",
        "Monitoring",
      ],
    },

    {
      key: "status",
      label: "Status",
      expectedType:: "status",
      required: true,

      options: [
        "Belum dikerjakan",
        "Dalam proses",
        "Selesai",
      ],
    },

    {
      key: "ditugaskanKe",
      label: "Ditugaskan ke",
      expectedType:: "relation",
      relation: "pekerja",
      required: true,
    },

    {
      key: "jenisTenagaKerja",
      label: "Jenis tenaga kerja",
      expectedType:: "rollup",
      source: "ditugaskanKe",
      property: "jenisTenagaKerja",
    },

    {
      key: "area",
      label: "Area",
      expectedType:: "relation",
      relation: "laba_rugi",
      required: true,
    },

    {
      key: "prioritas",
      label: "Prioritas",
      expectedType:: "select",

      options: [
        "Low",
        "Medium",
        "High",
      ],
    },

    {
      key: "waktuPengerjaan",
      label: "Waktu pengerjaan",
      expectedType:: "dateRange",
      required: true,
    },

    {
      key: "durasiKerja",
      label: "Durasi kerja",
      expectedType:: "number",

      metadata: {
        unit: "jam",
      },
    },

    {
      key: "catatan",
      label: "Catatan",
      expectedType:: "text",
    },

    {
      key: "lampiran",
      label: "Lampiran",
      expectedType:: "files",
    },
  ],
} as const;
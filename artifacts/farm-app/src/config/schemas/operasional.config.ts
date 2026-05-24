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
      type: "title",
      required: true,
    },

    {
      key: "kategori",
      label: "Kategori",
      type: "select",
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
      type: "status",
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
      type: "relation",
      relation: "pekerja",
      required: true,
    },

    {
      key: "jenisTenagaKerja",
      label: "Jenis tenaga kerja",
      type: "rollup",
      source: "ditugaskanKe",
      property: "jenisTenagaKerja",
    },

    {
      key: "area",
      label: "Area",
      type: "relation",
      relation: "laba_rugi",
      required: true,
    },

    {
      key: "prioritas",
      label: "Prioritas",
      type: "select",

      options: [
        "Low",
        "Medium",
        "High",
      ],
    },

    {
      key: "waktuPengerjaan",
      label: "Waktu pengerjaan",
      type: "dateRange",
      required: true,
    },

    {
      key: "durasiKerja",
      label: "Durasi kerja",
      type: "number",

      metadata: {
        unit: "jam",
      },
    },

    {
      key: "catatan",
      label: "Catatan",
      type: "text",
    },

    {
      key: "lampiran",
      label: "Lampiran",
      type: "files",
    },
  ],
} as const;
export const PERAWATAN_SCHEMA = {
  id: "perawatan",
  label: "Riwayat Perawatan",
  hint: "Pencatatan pupuk & pestisida",

  fields: [
    {
      key: "kegiatan",
      label: "Kegiatan",
      expectedType: "title",
    },

    {
      key: "tanggal",
      label: "Tanggal",
      expectedType: "date",
    },

    {
      key: "tags",
      label: "Tags",
      expectedType: "select",
    },

    {
      key: "status",
      label: "Status",
      expectedType: "status",
    },

    {
  key: "petugas",
  label: "Petugas",
  expectedType: "relation",
  aliases: [
    "petugas",
    "petugaslapangan",
    "pekerja",
    "team",
    "operator",
  ],
},

    {
      key: "labaRugi",
      label: "Area Laba Rugi",
      expectedType: "relation",
    },
  ],
} as const;
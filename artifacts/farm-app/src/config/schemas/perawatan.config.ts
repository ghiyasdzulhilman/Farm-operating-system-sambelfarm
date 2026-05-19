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
      expectedType: "multi_select",
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
    },

    {
      key: "labaRugi",
      label: "Area Laba Rugi",
      expectedType: "relation",
    },
  ],
} as const;
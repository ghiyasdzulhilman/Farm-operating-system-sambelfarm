export const PERAWATAN_SCHEMA = {
  id: "perawatan",

  label: "Riwayat Perawatan",

  notionDatabaseName: "Perawatan",

  fields: [
    {
      key: "kegiatan",
      label: "Kegiatan",
      type: "title",
      required: true,
    },

    {
      key: "tanggal",
      label: "Tanggal",
      type: "date",
    },

    {
      key: "tags",
      label: "Tags",
      type: "multi_select",
    },

    {
      key: "status",
      label: "Status",
      type: "status",
    },

    {
      key: "petugas",
      label: "Petugas",
      type: "relation",
    },

    {
      key: "labaRugi",
      label: "Area Laba Rugi",
      type: "relation",
    },
  ],
} as const;
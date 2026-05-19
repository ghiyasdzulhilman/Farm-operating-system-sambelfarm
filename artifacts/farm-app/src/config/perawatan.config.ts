export const PERAWATAN_FIELDS = [
  {
    key: "kegiatan",
    label: "Nama Kegiatan",
    type: "title",
    required: true,
  },

  {
    key: "tanggal",
    label: "Tanggal",
    type: "date",
    required: true,
  },

  {
    key: "tags",
    label: "Tags",
    type: "multi_select",
  },

  {
    key: "detailNotes",
    label: "Catatan Detail",
    type: "rich_text",
  },

  {
    key: "labaRugi",
    label: "Area Laba Rugi",
    type: "relation",
  },

  {
    key: "logProduk",
    label: "Log Produk",
    type: "array",
  },
];
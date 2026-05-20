export const PEKERJA_SCHEMA = {
  id: "pekerja",
  label: "Data Pekerja",
  hint: "Database pekerja & tim kebun",

  fields: [
    {
      key: "namaPekerja",
      label: "Nama pekerja",
      expectedType: "title",
    },

    {
      key: "role",
      label: "Role/Position",
      expectedType: "select",
    },

    {
      key: "area",
      label: "Area",
      expectedType: "relation",
    },

    {
      key: "contact",
      label: "Contact",
      expectedType: "phone_number",
    },

    {
      key: "mulaiBekerja",
      label: "Mulai bekerja",
      expectedType: "date",
    },

    {
      key: "status",
      label: "Status",
      expectedType: "status",
    },
  ],
} as const;
export const INSPEKSI_SCHEMA = {
  id: "inspeksi",
  label: "Inspeksi Rutin",
  hint: "Pencatatan hama dan penyakit",
  fields: [
    { 
      key: "kegiatan", 
      label: "Kegiatan", 
      expectedType: "title", 
      aliases: ["kegiatan", "judul", "nama", "task", "operasional", "treatment", "inspeksi"] 
    },
    { 
      key: "labaRugi", 
      label: "Area Laba Rugi", 
      expectedType: "relation", 
      aliases: ["area", "blok", "lahan", "pindah tanam"] 
    },
    { 
      key: "tanggal", 
      label: "Tanggal", 
      expectedType: "date", 
      aliases: ["tanggal", "date", "waktu", "hari", "created"] 
    },
    { 
      key: "hst", 
      label: "HST", 
      expectedType: "formula|rollup|number" 
    },
    { 
      key: "hama", 
      label: "Hama", 
      expectedType: "multi_select", 
      aliases: ["hama", "serangga", "kutu", "ulat"] 
    },
    { 
      key: "penyakit", 
      label: "Penyakit", 
      expectedType: "multi_select", 
      aliases: ["penyakit", "jamur", "virus", "bakteri", "bercak"] 
    },
    { 
      key: "tingkatSerangan", 
      label: "Tingkat Serangan (%)", 
      expectedType: "number" 
    },
    { 
      key: "radius", 
      label: "Radius (m2)", 
      expectedType: "number" 
    },
    { 
      key: "phTanah", 
      label: "pH Tanah", 
      expectedType: "number" 
    },
    { 
      key: "petugas", 
      label: "Petugas Lapangan", 
      expectedType: "relation",
      aliases: ["petugas", "petugaslapangan", "pekerja", "team", "operator"]
    },
    { 
      key: "status", 
      label: "Status", 
      expectedType: "status|select" 
    },
  ],
} as const;

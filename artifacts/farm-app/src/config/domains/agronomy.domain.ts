import { Leaf } from "lucide-react";

import { PERAWATAN_SCHEMA } from "../schemas/perawatan.config";

export const AGRONOMY_DOMAIN = {
  id: "agronomy",

  label: "Agronomy & Ops",

  icon: Leaf,

  description: "Perawatan, inspeksi, dan kegiatan umum",

  schemas: [
    PERAWATAN_SCHEMA,
  ],
};
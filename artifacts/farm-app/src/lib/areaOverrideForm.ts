export type AreaOverrideState = Record<string, boolean>;

type FormRecord = Record<string, unknown>;

type OverrideField<T extends FormRecord> = {
  broadcastKey: keyof T;
  perAreaKey: keyof T;
};

type BuildAreaOverridePayloadOptions<T extends FormRecord> = {
  values: T;
  areaIds: string[];
  overriddenAreas: AreaOverrideState;
  modeKeys: Array<keyof T>;
  fields: Array<OverrideField<T>>;
};

export const cloneFormValue = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => cloneFormValue(item)) as T;
  if (value && typeof value === "object") return { ...(value as Record<string, unknown>) } as T;
  return value;
};

const selectedOverrideIds = (areaIds: string[], overriddenAreas: AreaOverrideState) =>
  areaIds.filter((areaId) => Boolean(overriddenAreas[areaId]));

const getRecordValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};

const setMode = <T extends FormRecord>(payload: T, modeKeys: Array<keyof T>, mode: "broadcast" | "spesifik") => {
  modeKeys.forEach((modeKey) => {
    payload[modeKey] = mode as T[keyof T];
  });
};

export function copyBroadcastToArea<T extends FormRecord>(
  values: T,
  areaId: string,
  fields: Array<OverrideField<T>>,
): Partial<T> {
  return fields.reduce<Partial<T>>((updates, field) => {
    const record = getRecordValue(values[field.perAreaKey]);
    record[areaId] = cloneFormValue(values[field.broadcastKey]);
    updates[field.perAreaKey] = record as T[keyof T];
    return updates;
  }, {});
}

export function resetAreaOverride<T extends FormRecord>(
  values: T,
  areaId: string,
  fields: Array<OverrideField<T>>,
): Partial<T> {
  return fields.reduce<Partial<T>>((updates, field) => {
    const record = getRecordValue(values[field.perAreaKey]);
    delete record[areaId];
    updates[field.perAreaKey] = record as T[keyof T];
    return updates;
  }, {});
}

export function pruneOverrideState(areaIds: string[], overriddenAreas: AreaOverrideState): AreaOverrideState {
  return areaIds.reduce<AreaOverrideState>((next, areaId) => {
    if (overriddenAreas[areaId]) next[areaId] = true;
    return next;
  }, {});
}

export function buildAreaOverridePayload<T extends FormRecord>({
  values,
  areaIds,
  overriddenAreas,
  modeKeys,
  fields,
}: BuildAreaOverridePayloadOptions<T>): T {
  const payload = cloneFormValue(values);
  const activeOverrideIds = selectedOverrideIds(areaIds, overriddenAreas);
  const hasOverride = activeOverrideIds.length > 0;

  setMode(payload, modeKeys, hasOverride ? "spesifik" : "broadcast");

  fields.forEach((field) => {
    const sourceRecord = getRecordValue(values[field.perAreaKey]);
    const finalRecord: Record<string, unknown> = {};

    if (hasOverride) {
      areaIds.forEach((areaId) => {
        finalRecord[areaId] = overriddenAreas[areaId]
          ? cloneFormValue(sourceRecord[areaId])
          : cloneFormValue(values[field.broadcastKey]);
      });
    }

    payload[field.perAreaKey] = finalRecord as T[keyof T];
  });

  return payload;
}

export function buildBroadcastPerAreaRecord<T>(areaIds: string[], value: T): Record<string, T> {
  return areaIds.reduce<Record<string, T>>((record, areaId) => {
    record[areaId] = cloneFormValue(value);
    return record;
  }, {});
}

export function sanitizeRecordByArea<T>(record: Record<string, T> | undefined, areaIds: string[]): Record<string, T> {
  const source = record ?? {};
  return areaIds.reduce<Record<string, T>>((next, areaId) => {
    if (source[areaId] !== undefined) next[areaId] = cloneFormValue(source[areaId]);
    return next;
  }, {});
}

export function sanitizeNestedRecordByAllowedKeys(
  record: Record<string, Record<string, string>> | undefined,
  allowedKeysByArea: Record<string, string[]>,
): Record<string, Record<string, string>> {
  return Object.entries(allowedKeysByArea).reduce<Record<string, Record<string, string>>>((next, [areaId, allowedKeys]) => {
    const source = record?.[areaId] ?? {};
    next[areaId] = allowedKeys.reduce<Record<string, string>>((areaRecord, key) => {
      if (source[key] !== undefined) areaRecord[key] = source[key];
      return areaRecord;
    }, {});
    return next;
  }, {});
}

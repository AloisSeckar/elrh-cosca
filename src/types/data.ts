export type DataPrimitive = string | number | boolean | null
export type DataObject = { [key: string]: DataValue }
export type DataArray = DataValue[]
export type DataValue = DataPrimitive | DataObject | DataArray
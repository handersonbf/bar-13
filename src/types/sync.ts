export type SyncEntityType = 'CONFIGURACAO' | 'INTEGRANTE' | 'ITEM' | 'PEDIDO' | 'PEDIDO_ITEM' | 'COMPROVANTE';

export type SyncEventType =
  | 'INTEGRANTE_UPSERTED'
  | 'ITEM_UPSERTED'
  | 'PEDIDO_CRIADO'
  | 'PEDIDO_ITEM_ADICIONADO'
  | 'PEDIDO_ITEM_REMOVIDO'
  | 'PEDIDO_FECHADO'
  | 'PEDIDO_REABERTO'
  | 'PEDIDO_PAGO'
  | 'PEDIDO_CANCELADO'
  | 'COMPROVANTE_ANEXADO';

export interface SyncEventRecord {
  id: number;
  eventId: string;
  deviceId: string;
  deviceName: string;
  sequence: number;
  entityType: SyncEntityType;
  entitySyncId: string;
  eventType: SyncEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncBlobRecord {
  id: number;
  blobId: string;
  nome: string;
  mimeType: string;
  localUri: string;
  hash: string;
  createdAt: string;
}

export interface KnownDevice {
  deviceId: string;
  nomeAparelho: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastPackageId: string;
  lastExportedAt: string;
  lastImportedAt: string;
}

export interface SyncImportRecord {
  id: number;
  packageId: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  exportedAt: string;
  importedAt: string;
  eventCount: number;
  blobCount: number;
}

export interface SyncPackageBlob {
  blobId: string;
  nome: string;
  mimeType: string;
  hash: string;
  base64: string;
  createdAt: string;
}

export interface SyncPackageEvent {
  eventId: string;
  deviceId: string;
  deviceName: string;
  sequence: number;
  entityType: SyncEntityType;
  entitySyncId: string;
  eventType: SyncEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncPackageFile {
  schemaVersion: 1;
  packageId: string;
  exportedAt: string;
  sourceDevice: {
    deviceId: string;
    name: string;
  };
  events: SyncPackageEvent[];
  blobs: SyncPackageBlob[];
}

export interface SyncPackagePreview {
  packageId: string;
  exportedAt: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  totalEvents: number;
  newEvents: number;
  pedidos: number;
  comprovantes: number;
  integrantes: number;
  itens: number;
  warnings: string[];
}

export interface SyncImportResult {
  importedEvents: number;
  importedBlobs: number;
  importedPackages: number;
  preview: SyncPackagePreview;
}

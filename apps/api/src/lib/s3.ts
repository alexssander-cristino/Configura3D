import AWS from 'aws-sdk';

// Nota: este módulo usa aws-sdk (v2) para compatibilidade rápida. Pode ser
// migrado para @aws-sdk/client-s3 v3 sem afetar o restante da aplicação.

export interface StorageProvider {
  upload(params: {
    Bucket: string;
    Key: string;
    Body: Buffer | string;
    ContentType?: string;
    ACL?: string;
  }): Promise<{ Location: string; Key: string }>;
  getSignedUrl(params: {
    Bucket: string;
    Key: string;
    Expires?: number;
  }): Promise<string>;
}

let _s3: StorageProvider | null = null;

export const getStorage = (): StorageProvider | null => {
  if (_s3) return _s3;
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !bucket) {
    return null; // storage não configurado → fallback (sem upload de assets)
  }

  // Implementação mínima com AWS SDK v2 (disponível via aws-sdk).
  const s3 = new AWS.S3({
    endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3ForcePathStyle: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  _s3 = {
    upload: async ({ Bucket, Key, Body, ContentType, ACL }) => {
      const res = await s3.upload({ Bucket, Key, Body, ContentType, ACL }).promise();
      return { Location: res.Location, Key: res.Key };
    },
    getSignedUrl: async ({ Bucket, Key, Expires = 3600 }) => {
      return s3.getSignedUrl('getObject', { Bucket, Key, Expires });
    },
  };
  return _s3;
};

export const storageBucket = () => process.env.S3_BUCKET || 'configura3d';

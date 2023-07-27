import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsCommand,
  ObjectIdentifier,
  S3Client
} from "@aws-sdk/client-s3";
import { Progress, Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import assert from "assert/strict";

const { S3_ENDPOINT } = process.env;

assert(S3_ENDPOINT, "S3_ENDPOINT env var missing.");

const client = new S3Client({ endpoint: S3_ENDPOINT, region: "us-east-1" });

const streamFromBucket = async (bucketName: string, objectKey: string) => {
  const getObjectCommand = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
  const { Body } = await client.send(getObjectCommand);
  return Body as Readable;
};

const streamToBucket = (
  bucketName: string,
  objectKey: string,
  readableStream: Readable,
  onProgress?: (progress: Progress) => void
) => {
  const params = { Bucket: bucketName, Key: objectKey, Body: readableStream };
  const upload = new Upload({ client, params });
  if (onProgress) upload.on("httpUploadProgress", onProgress);
  return upload.done();
};

const deleteObject = (bucketName: string, objectKey: string) => {
  const deleteObjectCommand = new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey });
  return client.send(deleteObjectCommand);
};

const listObjects = async (bucketName: string, objectPrefix: string) => {
  const listObjectsCommand = new ListObjectsCommand({ Bucket: bucketName, Prefix: objectPrefix });
  const { Contents } = await client.send(listObjectsCommand);
  return Contents;
};

const deleteObjects = async (bucketName: string, objectPrefix: string) => {
  const Objects = (await listObjects(bucketName, objectPrefix)) as ObjectIdentifier[];
  const deleteObjectsCommand = new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects } });
  return client.send(deleteObjectsCommand);
};

export { deleteObject, deleteObjects, listObjects, streamFromBucket, streamToBucket };

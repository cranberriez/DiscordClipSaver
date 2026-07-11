import "server-only";

import { readFile } from "fs/promises";
import { isAbsolute, relative, resolve } from "path";

export type ThumbnailDelivery =
	| { kind: "redirect"; url: string }
	| { kind: "bytes"; body: Uint8Array };

let gcsClient: import("@google-cloud/storage").Storage | undefined;

async function getGcsClient() {
	if (!gcsClient) {
		const { Storage } = await import("@google-cloud/storage");
		gcsClient = new Storage({ projectId: process.env.GCS_PROJECT_ID });
	}
	return gcsClient;
}

function localObjectPath(root: string, objectKey: string): string {
	if (!objectKey || isAbsolute(objectKey)) {
		throw new Error("Invalid thumbnail object key");
	}
	const resolvedRoot = resolve(root);
	const resolvedObject = resolve(resolvedRoot, objectKey);
	const fromRoot = relative(resolvedRoot, resolvedObject);
	if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
		throw new Error("Thumbnail object key escapes storage root");
	}
	return resolvedObject;
}

async function readLocal(root: string, objectKey: string) {
	try {
		return new Uint8Array(await readFile(localObjectPath(root, objectKey)));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw error;
	}
}

function signedUrlTtlMs(): number {
	const raw = process.env.GCS_SIGNED_URL_TTL_SECONDS ?? "300";
	const seconds = Number(raw);
	if (!Number.isInteger(seconds) || seconds < 30 || seconds > 900) {
		throw new Error(
			"GCS_SIGNED_URL_TTL_SECONDS must be an integer from 30 to 900"
		);
	}
	return seconds * 1000;
}

export async function getThumbnailDelivery(
	objectKey: string
): Promise<ThumbnailDelivery | null> {
	const storageType = (process.env.STORAGE_TYPE ?? "local").toLowerCase();
	if (storageType === "local") {
		const body = await readLocal(
			process.env.STORAGE_PATH ?? resolve(process.cwd(), "storage"),
			objectKey
		);
		return body ? { kind: "bytes", body } : null;
	}

	if (storageType !== "gcs") {
		throw new Error(`Unsupported STORAGE_TYPE: ${storageType}`);
	}
	const bucketName = process.env.GCS_BUCKET_NAME;
	if (!bucketName)
		throw new Error("GCS_BUCKET_NAME is required for GCS storage");

	const storage = await getGcsClient();
	const file = storage.bucket(bucketName).file(objectKey);
	const [exists] = await file.exists();
	if (exists) {
		const [url] = await file.getSignedUrl({
			version: "v4",
			action: "read",
			expires: Date.now() + signedUrlTtlMs(),
		});
		return { kind: "redirect", url };
	}

	// Optional, read-only bridge during a rolling migration. It is never copied
	// or deleted here; the explicit migration command owns those changes.
	const fallbackRoot = process.env.GCS_LOCAL_FALLBACK_PATH;
	if (!fallbackRoot) return null;
	const body = await readLocal(fallbackRoot, objectKey);
	return body ? { kind: "bytes", body } : null;
}

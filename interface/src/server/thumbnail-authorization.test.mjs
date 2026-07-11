import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canAccessThumbnail } from "./thumbnail-authorization.js";

const active = {
	visibility: "PUBLIC",
	clip_deleted_at: null,
	author_id: "author",
};

describe("canAccessThumbnail", () => {
	it("allows public active thumbnails after channel authorization", () => {
		assert.equal(canAccessThumbnail(active, "member", false), true);
	});

	for (const visibility of ["UNLISTED", "PRIVATE"]) {
		it(`restricts ${visibility} thumbnails to the author or guild owner`, () => {
			const scope = { ...active, visibility };
			assert.equal(canAccessThumbnail(scope, "member", false), false);
			assert.equal(canAccessThumbnail(scope, "author", false), true);
			assert.equal(canAccessThumbnail(scope, "owner", true), true);
		});
	}

	it("restricts archived thumbnails to archive/delete permission holders", () => {
		const archived = { ...active, clip_deleted_at: new Date() };
		assert.equal(canAccessThumbnail(archived, "author", false), false);
		assert.equal(canAccessThumbnail(archived, "owner", true), true);
	});
});

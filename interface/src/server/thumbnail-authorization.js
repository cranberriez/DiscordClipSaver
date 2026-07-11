/**
 * @typedef {object} ThumbnailAuthorizationScope
 * @property {string} visibility
 * @property {Date | null} clip_deleted_at
 * @property {string} author_id
 */

/** Authorization after authentication, guild membership, and channel access.
 * @param {ThumbnailAuthorizationScope} scope
 * @param {string} userId
 * @param {boolean} isGuildOwner
 */
export function canAccessThumbnail(scope, userId, isGuildOwner) {
	if (scope.clip_deleted_at) {
		// Archive and deletion operations are guild-owner-only.
		return isGuildOwner;
	}
	if (scope.visibility === "PUBLIC") return true;
	return isGuildOwner || scope.author_id === userId;
}

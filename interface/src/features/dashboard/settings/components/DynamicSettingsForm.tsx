"use client";

import { useState } from "react";
import { useGuildSettingsWithBuilder } from "@/lib/hooks";
import {
    GuildSettingsSchema,
    DefaultChannelSettingsSchema,
} from "@/lib/schema/guild-settings.schema";
import {
    normalizeTimezone,
    getTimezoneDisplay,
} from "@/lib/utils/timezone-helpers";
import {
    channelSettingsMetadata,
    guildSettingsMetadata,
} from "../lib/settings-metadata";
import { type SettingMetadata } from "../types";

interface DynamicSettingsFormProps {
    guildId: string;
}

export default function DynamicSettingsForm({
    guildId,
}: DynamicSettingsFormProps) {
    const {
        settings,
        defaultChannelSettings,
        loading,
        saving,
        error,
        hasChanges,
        setGuildSetting,
        setDefaultChannelSetting,
        save,
        reset,
        resetToDefaults,
    } = useGuildSettingsWithBuilder(guildId);

    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate before saving
        setValidationErrors({});
        const guildValidation = GuildSettingsSchema.safeParse(settings);
        const channelValidation = DefaultChannelSettingsSchema.safeParse(
            defaultChannelSettings
        );

        const errors: Record<string, string> = {};
        if (!guildValidation.success) {
            guildValidation.error.issues.forEach(issue => {
                const field = issue.path.join(".");
                errors[`guild.${field}`] = issue.message;
            });
        }
        if (!channelValidation.success) {
            channelValidation.error.issues.forEach(issue => {
                const field = issue.path.join(".");
                errors[`channel.${field}`] = issue.message;
            });
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        try {
            await save();
            setValidationErrors({});
        } catch (err) {
            console.error("Failed to save:", err);
        }
    };

    const handleResetToDefaults = async () => {
        if (
            !confirm(
                "Are you sure you want to reset all settings to system defaults? This will save immediately."
            )
        ) {
            return;
        }
        try {
            await resetToDefaults();
        } catch (err) {
            console.error("Failed to reset to defaults:", err);
        }
    };

    if (loading) {
        return (
            <div className="p-6 border border-white/20 rounded-lg">
                <div className="animate-pulse text-muted-foreground">
                    Loading settings...
                </div>
            </div>
        );
    }

    const getError = (field: string) => validationErrors[field];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Messages */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
            {Object.keys(validationErrors).length > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-orange-400 text-sm font-semibold mb-2">
                        Validation Errors:
                    </p>
                    <ul className="text-orange-400 text-sm space-y-1 list-disc list-inside">
                        {Object.entries(validationErrors).map(
                            ([field, msg]) => (
                                <li key={field}>
                                    <strong>{field}:</strong> {msg}
                                </li>
                            )
                        )}
                    </ul>
                </div>
            )}

            {/* Guild Settings - Generated from metadata */}
            <section className="space-y-4 p-6 border border-white/20 rounded-lg">
                <h3 className="text-xl font-semibold">Guild Configuration</h3>

                {/* Basic Settings */}
                <div className="space-y-4">
                    {Object.entries(guildSettingsMetadata)
                        .filter(([_, meta]) => !meta.advanced)
                        .map(([key, meta]) => (
                            <SettingField
                                key={key}
                                fieldKey={key}
                                metadata={meta}
                                value={settings?.[key as keyof typeof settings]}
                                onChange={value =>
                                    setGuildSetting(key as any, value)
                                }
                                error={getError(`guild.${key}`)}
                            />
                        ))}
                </div>

                {/* Advanced Settings */}
                {Object.entries(guildSettingsMetadata).some(
                    ([_, meta]) => meta.advanced
                ) && (
                    <>
                        <div className="border-t border-white/10 pt-4 mt-6">
                            <p className="text-sm text-center text-gray-300 uppercase tracking-wider mb-4 -mt-7">
                                Advanced Settings
                            </p>
                            <div className="space-y-4">
                                {Object.entries(guildSettingsMetadata)
                                    .filter(([_, meta]) => meta.advanced)
                                    .map(([key, meta]) => (
                                        <SettingField
                                            key={key}
                                            fieldKey={key}
                                            metadata={meta}
                                            value={
                                                settings?.[
                                                    key as keyof typeof settings
                                                ]
                                            }
                                            onChange={value =>
                                                setGuildSetting(
                                                    key as any,
                                                    value
                                                )
                                            }
                                            error={getError(`guild.${key}`)}
                                        />
                                    ))}
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* Channel Settings - Generated from metadata */}
            <section className="space-y-4 p-6 border border-white/20 rounded-lg">
                <div>
                    <h3 className="text-xl font-semibold">
                        Default Channel Settings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        These settings will be applied to new channels by
                        default. Individual channels can override these.
                    </p>
                </div>

                {/* Basic Settings */}
                <div className="space-y-4">
                    {Object.entries(channelSettingsMetadata)
                        .filter(([_, meta]) => !meta.advanced)
                        .map(([key, meta]) => (
                            <SettingField
                                key={key}
                                fieldKey={key}
                                metadata={meta}
                                value={
                                    defaultChannelSettings?.[
                                        key as keyof typeof defaultChannelSettings
                                    ]
                                }
                                onChange={value =>
                                    setDefaultChannelSetting(key as any, value)
                                }
                                error={getError(`channel.${key}`)}
                            />
                        ))}
                </div>

                {/* Advanced Settings */}
                {Object.entries(channelSettingsMetadata).some(
                    ([_, meta]) => meta.advanced
                ) && (
                    <>
                        <div className="border-t border-white/10 pt-4 mt-6">
                            <p className="text-sm text-center text-gray-300 uppercase tracking-wider mb-4 -mt-7">
                                Advanced Settings
                            </p>
                            <div className="space-y-4">
                                {Object.entries(channelSettingsMetadata)
                                    .filter(([_, meta]) => meta.advanced)
                                    .map(([key, meta]) => (
                                        <SettingField
                                            key={key}
                                            fieldKey={key}
                                            metadata={meta}
                                            value={
                                                defaultChannelSettings?.[
                                                    key as keyof typeof defaultChannelSettings
                                                ]
                                            }
                                            onChange={value =>
                                                setDefaultChannelSetting(
                                                    key as any,
                                                    value
                                                )
                                            }
                                            error={getError(`channel.${key}`)}
                                        />
                                    ))}
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
                <button
                    type="submit"
                    disabled={!hasChanges || saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                    type="button"
                    onClick={reset}
                    disabled={!hasChanges || saving}
                    className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={handleResetToDefaults}
                    disabled={saving}
                    className="px-6 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Reset to Defaults
                </button>
                {hasChanges && (
                    <span className="text-sm text-orange-400">
                        • Unsaved changes
                    </span>
                )}
            </div>
        </form>
    );
}

// Generic field component that renders based on metadata
interface SettingFieldProps {
    fieldKey: string;
    metadata: SettingMetadata;
    value: any;
    onChange: (value: any) => void;
    error?: string;
}

function SettingField({
    fieldKey,
    metadata,
    value,
    onChange,
    error,
}: SettingFieldProps) {
    const baseInputClass = `w-full px-3 py-2 bg-white/5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
    const errorClass = error ? "border-red-500" : "border-white/20";

    // Boolean (checkbox)
    if (metadata.type === "boolean") {
        return (
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    id={fieldKey}
                    checked={value ?? false}
                    onChange={e => onChange(e.target.checked)}
                    className="mt-1 w-4 h-4"
                />
                <div>
                    <label
                        htmlFor={fieldKey}
                        className="text-sm font-medium block"
                    >
                        {metadata.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                        {metadata.description}
                    </p>
                </div>
            </div>
        );
    }

    // Select (dropdown)
    if (metadata.type === "select" && metadata.options) {
        return (
            <div>
                <label className="block text-sm font-medium mb-2">
                    {metadata.label}
                </label>
                <select
                    value={value ?? metadata.options[0]?.value}
                    onChange={e => onChange(e.target.value)}
                    className={`${baseInputClass} ${errorClass}`}
                >
                    {metadata.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error ? (
                    <p className="text-xs text-red-400 mt-1">{error}</p>
                ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                        {metadata.description}
                    </p>
                )}
            </div>
        );
    }

    // Number input
    if (metadata.type === "number") {
        return (
            <div>
                <label className="block text-sm font-medium mb-2">
                    {metadata.label}
                </label>
                <input
                    type="number"
                    value={value ?? ""}
                    onChange={e => {
                        const val = e.target.value;
                        onChange(val === "" ? undefined : parseInt(val, 10));
                    }}
                    min={metadata.min}
                    max={metadata.max}
                    placeholder={metadata.placeholder}
                    className={`${baseInputClass} ${errorClass}`}
                />
                {error ? (
                    <p className="text-xs text-red-400 mt-1">{error}</p>
                ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                        {metadata.description}
                        {metadata.min !== undefined &&
                            metadata.max !== undefined &&
                            ` (${metadata.min}-${metadata.max})`}
                    </p>
                )}
            </div>
        );
    }

    // Text/Textarea with special handling for timezone
    const InputComponent = metadata.type === "textarea" ? "textarea" : "input";
    const isTimezone = fieldKey === "tz";

    // Get timezone info for preview
    let timezonePreview: string | null = null;
    let timezoneNormalized: string | null = null;

    if (isTimezone && value) {
        const normalized = normalizeTimezone(value);
        timezoneNormalized = normalized !== value ? normalized : null;
        timezonePreview = getTimezoneDisplay(normalized);
    }

    return (
        <div>
            <label className="block text-sm font-medium mb-2">
                {metadata.label}
            </label>
            <InputComponent
                type={metadata.type === "textarea" ? undefined : "text"}
                value={value ?? ""}
                onChange={e => onChange(e.target.value || null)}
                placeholder={metadata.placeholder}
                className={`${baseInputClass} ${errorClass}`}
                rows={metadata.type === "textarea" ? 3 : undefined}
            />
            {error ? (
                <p className="text-xs text-red-400 mt-1">{error}</p>
            ) : (
                <>
                    <p className="text-xs text-muted-foreground mt-1">
                        {metadata.description}
                    </p>
                    {timezoneNormalized && (
                        <p className="text-xs text-blue-400 mt-1">
                            → Resolves to: {timezoneNormalized}
                        </p>
                    )}
                    {timezonePreview && (
                        <p className="text-xs text-green-400 mt-1">
                            ✓ Current time: {timezonePreview}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

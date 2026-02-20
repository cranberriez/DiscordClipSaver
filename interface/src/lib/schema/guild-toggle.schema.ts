import { z } from "zod";

export const ToggleSchema = z.object({
	enabled: z.boolean(),
});
